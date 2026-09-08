"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export async function updateTeamAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const teamId = String(formData.get("teamId") ?? "");
  const team = teamId ? await prisma.team.findUnique({ where: { id: teamId } }) : null;
  if (!team) redirect("/settings?error=所属を選択してください");

  await prisma.user.update({ where: { id: user!.id }, data: { teamId: team!.id } });
  redirect("/settings?saved=team");
}

export async function changePasswordAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!(await verifyPassword(currentPassword, user!.passwordHash))) {
    redirect(`/settings?error=${encodeURIComponent("現在のパスワードが正しくありません")}`);
  }
  if (newPassword.length < 8) {
    redirect(`/settings?error=${encodeURIComponent("新しいパスワードは8文字以上にしてください")}`);
  }

  // パスワードを変えたら、他の端末に残っているセッションも切る。
  const updated = await prisma.user.update({
    where: { id: user!.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      sessionVersion: { increment: 1 },
    },
  });
  // 世代を進めると今のCookieも無効になるので、自分の分だけ貼り直す。
  await reissueSession(updated.id, updated.sessionVersion);

  redirect("/settings?saved=password");
}

/** 世代を進めたあと、操作した本人だけログインを保てるようCookieを貼り直す。 */
async function reissueSession(userId: string, sessionVersion: number) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    createSessionToken(userId, sessionVersion),
    SESSION_COOKIE_OPTIONS,
  );
}

/** 氏名とログインIDを変更する。改姓やメールアドレスの変更に対応するため。 */
export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const loginId = String(formData.get("loginId") ?? "").trim();

  if (!name || !loginId) {
    redirect(`/settings?error=${encodeURIComponent("氏名とIDを入力してください")}`);
  }
  if (loginId !== user!.loginId) {
    const taken = await prisma.user.findUnique({ where: { loginId } });
    if (taken) {
      redirect(`/settings?error=${encodeURIComponent("そのIDはすでに使われています")}`);
    }
  }

  await prisma.user.update({
    where: { id: user!.id },
    data: { name, loginId },
  });

  redirect("/settings?saved=profile");
}

/**
 * 他の端末のセッションを切る。
 * セッションはDBに持たない署名付きCookie方式なので、世代を1つ進めることで
 * 発行済みのトークンをまとめて無効にする。操作した端末だけ貼り直して残す。
 */
export async function revokeOtherSessionsAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const updated = await prisma.user.update({
    where: { id: user!.id },
    data: { sessionVersion: { increment: 1 } },
  });
  await reissueSession(updated.id, updated.sessionVersion);

  redirect("/settings?saved=sessions");
}

/**
 * 管理者が、同じチームのメンバーの権限を変える。
 * 自分自身は変えられない（最後の管理者が自分を降格させて詰むのを防ぐ）。
 */
export async function updateMemberRoleAction(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin) redirect("/login");
  if (admin!.role !== "admin") redirect("/settings");

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") === "admin" ? "admin" : "member";

  if (userId === admin!.id) {
    redirect(`/settings?error=${encodeURIComponent("自分の権限は変更できません")}`);
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, teamId: admin!.teamId ?? undefined },
  });
  if (!target) redirect("/settings");

  await prisma.user.update({ where: { id: target!.id }, data: { role } });
  redirect("/settings?saved=role");
}

/**
 * 管理者が、同じチームのメンバーの利用を止める／再開する。
 * 退職者のアカウントを止めるための機能。削除ではないので、
 * その人が書いた共有メモなどの記録は残る。
 * 止めた相手はすぐ入れなくなる（getCurrentUser が isActive を見ている）。
 */
export async function updateMemberActiveAction(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin) redirect("/login");
  if (admin!.role !== "admin") redirect("/settings");

  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "") === "1";

  if (userId === admin!.id) {
    redirect(`/settings?error=${encodeURIComponent("自分のアカウントは停止できません")}`);
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, teamId: admin!.teamId ?? undefined },
  });
  if (!target) redirect("/settings");

  await prisma.user.update({
    where: { id: target!.id },
    // 止めるときは世代も進め、ログイン中の端末をその場で締め出す。
    data: active
      ? { isActive: true }
      : { isActive: false, sessionVersion: { increment: 1 } },
  });

  redirect(`/settings?saved=${active ? "reactivated" : "deactivated"}`);
}

/**
 * アカウントを削除する（退会）。取り消せない操作なので、パスワードの再入力を必須にしている。
 *
 * 消すのは「その人だけのもの」に限る。
 *   削除する … チャットの会話・メッセージとその添付、ToDo、メモ
 *   残す     … 業務内容、カレンダーの予定（チーム全員で使う資料のため）
 * 残すものは登録者を null にして「退会したユーザー」と表示する。
 */
export async function deleteAccountAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  if (!password) {
    redirect(`/settings?error=${encodeURIComponent("パスワードを入力してください")}`);
  }
  if (!(await verifyPassword(password, user!.passwordHash))) {
    redirect(`/settings?error=${encodeURIComponent("パスワードが正しくありません")}`);
  }

  const userId = user!.id;

  // 途中で失敗すると「個人データだけ消えてアカウントは残る」中途半端な状態に
  // なるため、一連の削除はトランザクションでまとめて実行する。
  await prisma.$transaction(async (tx) => {
    // 1. 本人だけのデータを消す（添付 → メッセージ → 会話 の順。順番を守らないと
    //    参照だけが外れた添付が残る）
    await tx.attachment.deleteMany({ where: { chatMessage: { userId } } });
    await tx.chatMessage.deleteMany({ where: { userId } });
    await tx.conversation.deleteMany({ where: { userId } });
    await tx.todo.deleteMany({ where: { userId } });
    await tx.note.deleteMany({ where: { userId } });
    // みんなのメモへのいいね・非表示は本人だけのものなので一緒に消す。
    await tx.sharedNoteLike.deleteMany({ where: { userId } });
    await tx.sharedNoteHide.deleteMany({ where: { userId } });

    // 2. チームで共有しているものは消さず、登録者だけ外す
    await tx.taskEntry.updateMany({
      where: { createdById: userId },
      data: { createdById: null },
    });
    await tx.event.updateMany({
      where: { createdById: userId },
      data: { createdById: null },
    });

    // 3. アカウント本体を消す
    await tx.user.delete({ where: { id: userId } });
  });

  // セッションを破棄する

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);

  redirect(`/login?error=${encodeURIComponent("アカウントを削除しました。ご利用ありがとうございました。")}`);
}

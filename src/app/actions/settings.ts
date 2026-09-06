"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export async function updateNicknameAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nickname = String(formData.get("nickname") ?? "").trim();
  await prisma.user.update({
    where: { id: user!.id },
    data: { nickname: nickname || null },
  });

  redirect("/settings?saved=nickname");
}

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

  await prisma.user.update({
    where: { id: user!.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  redirect("/settings?saved=password");
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

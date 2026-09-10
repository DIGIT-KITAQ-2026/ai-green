"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export async function updateTeamAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const teamId = String(formData.get("teamId") ?? "");
  const supabase = await createClient();

  const { data: team } = teamId
    ? await supabase.from("teams").select("id").eq("id", teamId).maybeSingle()
    : { data: null };
  if (!team) redirect("/settings?error=所属を選択してください");

  await supabase.from("profiles").update({ team_id: team!.id }).eq("id", user!.id);
  redirect("/settings?saved=team");
}

/**
 * 現在のパスワードを確かめる。
 * Supabase には「今のパスワードが合っているか」だけを見るAPIが無いので、
 * 同じIDでログインし直せるかどうかで確認している。
 */
async function verifyCurrentPassword(loginId: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: loginId,
    password,
  });
  return !error;
}

export async function changePasswordAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!(await verifyCurrentPassword(user!.loginId, currentPassword))) {
    redirect(`/settings?error=${encodeURIComponent("現在のパスワードが正しくありません")}`);
  }
  if (newPassword.length < 8) {
    redirect(`/settings?error=${encodeURIComponent("新しいパスワードは8文字以上にしてください")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    redirect(`/settings?error=${encodeURIComponent("パスワードを変更できませんでした")}`);
  }

  // パスワードを変えたら、他の端末に残っているセッションも切る。
  // 操作した端末は scope: "others" なのでログインしたまま残る。
  await supabase.auth.signOut({ scope: "others" });

  redirect("/settings?saved=password");
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

  const supabase = await createClient();
  await supabase.from("profiles").update({ name }).eq("id", user!.id);

  if (loginId !== user!.loginId) {
    // ログインIDは Supabase Auth 側のメールアドレス。
    // メール確認が有効な環境では、確認が済むまで古いIDのままになる。
    const { error } = await supabase.auth.updateUser({ email: loginId });
    if (error) {
      const message = error.message.includes("already")
        ? "そのIDはすでに使われています"
        : "IDを変更できませんでした。メールアドレスの形式で入力してください。";
      redirect(`/settings?error=${encodeURIComponent(message)}`);
    }
  }

  redirect("/settings?saved=profile");
}

/**
 * 他の端末のセッションを切る。
 * Supabase 側で発行済みのリフレッシュトークンを失効させる。
 * 操作した端末は scope: "others" なので残る。
 */
export async function revokeOtherSessionsAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "others" });

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

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .eq("team_id", admin!.teamId ?? "")
    .maybeSingle();
  if (!target) redirect("/settings");

  await supabase.from("profiles").update({ role }).eq("id", target!.id);
  redirect("/settings?saved=role");
}

/**
 * 管理者が、同じチームのメンバーの利用を止める／再開する。
 * 退職者のアカウントを止めるための機能。削除ではないので、
 * その人が書いた共有メモなどの記録は残る。
 *
 * profiles.is_active は画面表示と getCurrentUser の判定に使い、
 * それとは別に Supabase Auth 側でも ban して、ログイン中の端末をその場で
 * 締め出す（フラグだけでは、発行済みのトークンが期限まで生き残るため）。
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

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .eq("team_id", admin!.teamId ?? "")
    .maybeSingle();
  if (!target) redirect("/settings");

  await supabase.from("profiles").update({ is_active: active }).eq("id", target!.id);

  // ban / 解除は本人としては実行できないので、管理用クライアントから行う。
  await createAdminClient().auth.admin.updateUserById(target!.id, {
    ban_duration: active ? "none" : "876000h", // 100年 ≒ 無期限
  });

  redirect(`/settings?saved=${active ? "reactivated" : "deactivated"}`);
}

/**
 * アカウントを削除する（退会）。取り消せない操作なので、パスワードの再入力を必須にしている。
 *
 * 消すのは「その人だけのもの」に限る。
 *   削除する … チャットの会話・メッセージとその添付、ToDo、メモ、いいね、非表示
 *   残す     … 業務内容、カレンダーの予定、みんなのメモ（チーム全員で使うため）
 * 残すものは登録者を null にして「退会したユーザー」と表示する。
 *
 * この振り分けは外部キーの on delete（cascade / set null）に持たせてあるので、
 * auth.users を1行消せばDB側でまとめて処理される。
 * 途中で失敗して中途半端な状態になることがない。
 */
export async function deleteAccountAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  if (!password) {
    redirect(`/settings?error=${encodeURIComponent("パスワードを入力してください")}`);
  }
  if (!(await verifyCurrentPassword(user!.loginId, password))) {
    redirect(`/settings?error=${encodeURIComponent("パスワードが正しくありません")}`);
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(user!.id);
  if (error) {
    redirect(`/settings?error=${encodeURIComponent("アカウントを削除できませんでした")}`);
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect(`/login?error=${encodeURIComponent("アカウントを削除しました。ご利用ありがとうございました。")}`);
}

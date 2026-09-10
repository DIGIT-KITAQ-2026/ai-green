"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * ログイン・新規登録・ログアウト。
 *
 * ID とパスワードの管理は Supabase Auth に任せている。
 * 画面上の「ログインID」は Supabase のメールアドレスにあたる。
 * profiles の行は auth.users への insert トリガ（handle_new_user）が作る。
 */

export async function loginAction(formData: FormData) {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!loginId || !password) {
    redirect(`/login?error=${encodeURIComponent("IDとパスワードを入力してください")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginId,
    password,
  });

  if (error || !data.user) {
    // 管理者に停止されたアカウントは Supabase 側で弾かれる。
    // 理由が分かる文面にして、問い合わせ先を案内する。
    const message =
      error?.code === "user_banned"
        ? "このアカウントは利用が停止されています。管理者にお問い合わせください。"
        : "IDまたはパスワードが正しくありません";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id, is_active")
    .eq("id", data.user!.id)
    .single();

  // 管理者に停止されたアカウント。入れたままにせず、その場でセッションを切る。
  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent("このアカウントは利用が停止されています。管理者にお問い合わせください。")}`,
    );
  }

  redirect(profile?.team_id ? "/" : "/onboarding/team");
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // 役割は登録時に本人が選ぶ。あとから設定 > メンバー管理でも変えられる。
  const asAdmin = String(formData.get("role") ?? "") === "admin";

  if (!name || !loginId || !password) {
    redirect(`/signup?error=${encodeURIComponent("すべての項目を入力してください")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("パスワードは8文字以上にしてください")}`);
  }

  const supabase = await createClient();
  // name はトリガ側で profiles.name に入れるため、メタデータで渡す。
  const { data, error } = await supabase.auth.signUp({
    email: loginId,
    password,
    options: { data: { name } },
  });

  if (error) {
    // Supabaseの確認メール送信には送信元(anthropic-ai/claude-agent-sdk)ごとの
    // レート制限があり、テストの繰り返し等で上限に達するとここに来る。
    // 「メール形式が違う」と誤解させないよう、原因が分かる文面にする。
    let message = "登録できませんでした。IDはメールアドレスの形式で入力してください。";
    if (error.code === "user_already_exists" || error.message.includes("already registered")) {
      message = "そのIDはすでに使われています";
    } else if (error.code === "over_email_send_rate_limit") {
      message =
        "確認メールの送信回数が上限に達しています。しばらく時間をおいて再度お試しください。";
    }
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }
  // profiles の role は本人には変えられないようにしてあるので、
  // 登録時に選んだ役割は管理用クライアントから付ける。
  if (asAdmin && data.user) {
    await createAdminClient()
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id);
  }

  if (!data.session) {
    // メール確認が有効な環境ではここに来る。
    redirect(
      `/login?error=${encodeURIComponent("確認メールを送りました。メール内のリンクを開いてからログインしてください。")}`,
    );
  }

  redirect("/onboarding/team");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

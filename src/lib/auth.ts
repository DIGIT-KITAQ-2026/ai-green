import { createClient } from "./supabase/server";

/**
 * ログイン中のユーザー。
 *
 * ログインIDとパスワードは Supabase Auth（auth.users）が持ち、
 * アプリ固有の属性は public.profiles に置いている。画面では両方使うので、
 * ここで1つにまとめて返す。プロパティ名は移行前（Prisma）のままにして、
 * 画面側の変更を最小限にしている。
 */
export type CurrentUser = {
  id: string;
  /** ログインID。Supabase Auth のメールアドレス。 */
  loginId: string;
  name: string;
  role: "member" | "admin";
  teamId: string | null;
  team: { id: string; name: string } | null;
  xp: number;
  selectedRewardId: string | null;
  isActive: boolean;
  createdAt: string;
};

/**
 * サーバーコンポーネント / Server Action / Route Handler から、
 * 現在ログイン中のユーザーを取得する。
 *
 * 認可はレイアウトに任せず、データを取る直前で必ずこれを呼ぶこと。
 * レイアウトの redirect はページの描画自体を止めないため、これが無いと
 * 未ログインでもレスポンス本文に中身が載ってしまう。
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  // getSession ではなくこちら。Cookieの中身を信じず、サーバー側で検証する。
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role, team_id, xp, selected_reward_id, is_active, created_at, team:teams(id, name)")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  // 管理者に止められたアカウントは入れない。
  if (!profile.is_active) return null;

  return {
    id: profile.id,
    loginId: user.email ?? "",
    name: profile.name,
    role: profile.role === "admin" ? "admin" : "member",
    teamId: profile.team_id,
    team: profile.team ?? null,
    xp: profile.xp,
    selectedRewardId: profile.selected_reward_id,
    isActive: profile.is_active,
    createdAt: profile.created_at,
  };
}

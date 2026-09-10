import { createAdminClient } from "./supabase/admin";

/**
 * 経験値を加算する。
 *
 * 加算そのものは管理用クライアントから呼ぶ。加算をユーザーの権限で行えるように
 * すると、「1日4問まで」などの上限をすり抜けて直接叩けてしまうため
 * （上限は各Server Action側で見ている）。
 *
 * 加算はDB側の add_xp 関数で行う。読んでから書くと、同時に2つ処理が走ったときに
 * 片方の加算が消えるため。
 */
export async function awardXp(userId: string, amount: number) {
  if (amount <= 0) return;
  const { error } = await createAdminClient().rpc("add_xp", {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) console.error("経験値の加算に失敗しました", error);
}

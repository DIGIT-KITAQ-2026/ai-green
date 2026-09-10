import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * RLSを通さない管理用クライアント。
 *
 * 使うのは、ログイン中の本人としては実行できない操作だけに限る。
 *   ・アカウントの削除（auth.users を消す）
 *   ・他の端末からのログアウト、停止したユーザーの締め出し
 *   ・シード投入
 *
 * 画面から普通に呼ぶ処理では使わないこと（RLSが効かなくなるため）。
 * SUPABASE_SERVICE_ROLE_KEY は絶対にクライアントへ渡さない。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です（README参照）。",
    );
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

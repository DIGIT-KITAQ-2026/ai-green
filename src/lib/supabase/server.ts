import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * ログイン中のユーザーとしてSupabaseに繋ぐクライアント。
 *
 * 認証情報はCookieで運ぶので、ここから投げるクエリにはRLSがそのまま効く
 * （supabase/migrations/*_rls_policies.sql の条件で絞られる）。
 * サーバーコンポーネントとServer Actionからはこちらを使うこと。
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // サーバーコンポーネントからはCookieを書けない。
            // トークンの更新は middleware.ts 側で行う。
          }
        },
      },
    },
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} が設定されていません。.env.local を確認してください（README参照）。`,
    );
  }
  return value;
}

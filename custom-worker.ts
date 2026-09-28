/**
 * Cloudflare Worker の入口。OpenNext が生成した Worker をそのまま包み、定期実行だけを足す。
 * https://opennext.js.org/cloudflare/howtos/custom-worker
 *
 * Supabase の無料プランは、DBへのリクエストが7日間ないとプロジェクトを一時停止する。
 * 止まるとデモURLを開いてもログインできないので、1日1回だけ軽い読み取りを送って止まらないようにする。
 * 就職活動の期間だけで十分なので、KEEP_ALIVE_UNTIL を過ぎたら何もしない。
 */

// @ts-ignore `.open-next/worker.js` はビルド時に生成される
import { default as handler } from "./.open-next/worker.js";
// @ts-ignore ビルド時に生成される。scripts/strip-server-env.mjs で NEXT_PUBLIC_ の値だけにしてある
import { production as publicEnv } from "./.open-next/cloudflare/next-env.mjs";

const KEEP_ALIVE_UNTIL = new Date("2027-09-01T00:00:00+09:00");

async function pingSupabase() {
  if (Date.now() >= KEEP_ALIVE_UNTIL.getTime()) {
    console.log("Supabaseの定期アクセスは期限を過ぎたので行いません。");
    return;
  }

  const url: string = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key: string = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // 部門の一覧を1件だけ読む。RLSで0件になっても、DBへのリクエストとして数えられる。
  const res = await fetch(`${url}/rest/v1/teams?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.error(`Supabaseへの定期アクセスに失敗しました（${res.status}）`);
    return;
  }
  console.log("Supabaseへの定期アクセスが完了しました。");
}

export default {
  fetch: handler.fetch,

  async scheduled(
    _controller: unknown,
    _env: unknown,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ) {
    ctx.waitUntil(pingSupabase());
  },
};

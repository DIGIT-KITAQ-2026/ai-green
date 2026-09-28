/**
 * OpenNext は `opennextjs-cloudflare build` のときに .env / .env.local の中身を
 * .open-next/cloudflare/next-env.mjs に書き出し、Worker のコードに埋め込む。
 * そのままだと .env.local の SUPABASE_SERVICE_ROLE_KEY などがデプロイされるコードに入るので、
 * ブラウザにも元から見えている NEXT_PUBLIC_ の値だけを残す。
 *
 * 秘密は `npx wrangler secret put` で登録し、実行時に Worker の環境変数から読ませる。
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const file = ".open-next/cloudflare/next-env.mjs";
const envByMode = await import(pathToFileURL(file).href);

const lines = Object.entries(envByMode).map(([mode, vars]) => {
  const kept = Object.fromEntries(
    Object.entries(vars).filter(([key]) => key.startsWith("NEXT_PUBLIC_")),
  );
  return `export const ${mode} = ${JSON.stringify(kept)};`;
});
fs.writeFileSync(file, lines.join("\n") + "\n");
console.log(`${file} から NEXT_PUBLIC_ 以外の値を取り除きました。`);

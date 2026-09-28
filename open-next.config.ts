import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// ISR や 'use cache' は使っていないので、キャッシュ用のR2は付けない。
export default defineCloudflareConfig();

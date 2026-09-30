# 新-cha-（しんちゃ）

総務・人事・経理・法務といったコーポレート部門の新人が、社内の規程や手続きをAIに質問できる
社内ナレッジアプリです。

新人は、わからないことをチャットで聞くか、手元の書類の写真やPDFを送るだけで答えが得られます。
先輩社員は、業務手順の資料を写真やPDFのままアップロードするだけでナレッジを登録できます。
AI（Claude）が資料を読み取って蓄積し、質問に対しては蓄積された業務内容から根拠を選んで回答します。
PCのWebブラウザで使う業務システムとして設計しています。

**デモ**: https://shincha.izumikeitarou80.workers.dev （ID `demo@shincha.local` / パスワード `password123`）

## 制作の経緯

北九州市主催の学生向けIT実践プログラム「[DIG IT KITAQ](https://dig-it-kitaq.jp/)」のハッカソンで、
5名のチームで制作し、準優勝しました。

## 主な機能

- **業務内容の登録とAI読み取り** … 先輩・管理者が画像（jpg/png）やPDFをアップロードすると、
  AIが内容を全文書き起こし、一覧用の要約を作ります。
- **チャットでの質問** … 新人の質問（添付ファイルも可）に対し、登録済みの業務内容から関連するものを
  選んで回答し、根拠にした業務内容へのリンクを示します。資料に書かれていないことは答えません。
  過去の会話を開いて続きを聞くこともできます。
- **みんなのメモ** … 役に立ったチャットのやり取りを、AIが「誰が聞いたか」を除いた共有メモに要約し、
  同じ部門のメンバーに共有できます。いいねと絞り込みに対応しています。
- **カレンダー・ToDo・個人メモ** … 部門の予定の共有と、自分用のToDo・メモ。
- **キャラクターと経験値** … 質問やToDoの完了で経験値がたまり、レベルに応じてAIの案内役の
  キャラクター（話し方）が増えます。口調は変わっても、回答の内容と正確さは変わらないようにしています。
- **役割ごとの権限** … 新人と先輩・管理者で操作できる範囲を分けています。先輩・管理者は
  業務内容の登録・削除、メンバー管理、メンバーの質問傾向（どの資料をよく参照したか）の確認ができます。

### 画面一覧

| 画面                         | URL                                                     |
| ---------------------------- | ------------------------------------------------------- |
| ログイン・新規登録           | `/login`, `/signup`                                     |
| 所属部門の選択               | `/onboarding/team`（新規登録直後）、`/settings`（変更） |
| ホーム                       | `/`                                                     |
| 業務内容（一覧・詳細・登録） | `/tasks`, `/tasks/[id]`, `/tasks/new`                   |
| チャット                     | `/chat`, `/chat/[id]`                                   |
| みんなのメモ                 | `/team-notes`, `/team-notes/[id]`                       |
| カレンダー・ToDo             | `/calendar`                                             |
| 個人メモ                     | `/notes`                                                |
| キャラクター                 | `/character`                                            |
| 設定                         | `/settings`                                             |

## 技術構成

| 領域           | 採用技術                                                                |
| -------------- | ----------------------------------------------------------------------- |
| フレームワーク | Next.js 16（App Router, Server Actions）+ TypeScript                    |
| スタイル       | Tailwind CSS（お茶をモチーフにした茶色・抹茶色のパレット）              |
| データベース   | Supabase（PostgreSQL）。テーブルはRLS（行レベルセキュリティ）で保護     |
| ファイル       | Supabase Storage（`attachments` バケット）。画像・PDFの実体はここに置く |
| 認証           | Supabase Auth（メールアドレス＋パスワード）                             |
| AI             | Anthropic API（Claude）。`@anthropic-ai/sdk` から呼び出す               |

### AIの使い方

AIの呼び出しは [src/lib/claudeAgent.ts](./src/lib/claudeAgent.ts) にまとめています。
使う場面は次の3つで、どれも1回の問い合わせで完結し、結果はJSONで受け取ります。

1. 登録された資料（画像・PDF）の書き起こしと要約
2. チャットの質問への回答と、根拠にした業務内容の選択
3. チャットのやり取りを共有メモに要約

社内規程を扱うため、プロンプトでは「期限・金額・承認者などの条件を省略しない」
「候補に書かれていないことを答えない」ことを全キャラクター共通の指示にしています。

回答の根拠になる業務内容の候補は、質問文との文字bi-gramの類似度で絞り込んでから
AIに渡しています（[src/lib/retrieval.ts](./src/lib/retrieval.ts)）。外部の埋め込みAPIを使わない
軽量な実装で、ベクトル検索に差し替える場合も呼び出し側のインターフェースは変わりません。

## セットアップ

必要なもの：Node.js 20以上、Supabaseプロジェクト、Anthropic APIキー。

```bash
npm install
```

### 1. Supabaseプロジェクトを用意する

[Supabase](https://supabase.com/) でプロジェクトを作り、スキーマを適用します。

- **CLI**: `supabase login` → `supabase link --project-ref <プロジェクトID>` → `supabase db push`
- **ダッシュボード**: `supabase/migrations/` のSQLをファイル名の順に SQL Editor へ貼って実行する

### 2. 環境変数を設定する

```bash
cp .env.example .env.local
```

`.env.local` に、Supabaseの Project Settings > API にある3つの値と、Anthropic APIキーを書きます。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
```

APIキーがなくても画面の閲覧などは動きますが、AIを使う処理（資料の読み取り・チャット回答・メモの要約）は
エラーになります。

<details>
<summary>.env と .env.local の使い分け</summary>

リポジトリの `.env` には、作者が用意したデモ環境のURLとanonキーだけをコミットしています。

`NEXT_PUBLIC_` が付いた変数は、ビルド時にブラウザ向けのJSへそのまま埋め込まれます。
つまりアプリを開いた人には元から見えているので、リポジトリに入れても増えるリスクはありません。
データを守っているのはこの鍵ではなく、Supabase側のRLS（行レベルセキュリティ）です。

`SUPABASE_SERVICE_ROLE_KEY` はRLSを一切通しません。漏れると誰でも全ユーザーのチャットを
読めて、データもアカウントも消せます。`ANTHROPIC_API_KEY` も漏れると課金に直結します。
この2つは `.env.local`（`.gitignore` 済み）に置き、コミットしません。

Next.jsは `.env.local` を `.env` より優先して読むので、`.env.local` にURLとanonキーを書けば
自分のSupabaseプロジェクトに繋がります。

</details>

<details>
<summary>ローカルのSupabaseで動かす場合</summary>

Docker と [Supabase CLI](https://supabase.com/docs/guides/cli) が必要です。
`supabase start` が表示する `API URL` / `ANON_KEY` / `SERVICE_ROLE_KEY` を
`.env.local` に書けば、ローカルに繋がります。
マイグレーションは `supabase start` / `npm run db:reset` の時点で自動適用されます。

</details>

### 3. デモデータを入れる

```bash
npm run db:seed
```

入るもの:

- 所属部門4件（人事 / 総務 / 経理 / 法務）
- デモアカウント（`demo@shincha.local` / `password123`、先輩・管理者、Lv8）
- デモ用の業務内容32件（PDF添付つき／4部門分）
- デモ用のみんなのメモ16件（4部門×4件）

デモ用の業務内容は `supabase/seed-data/` に置いています。実際に登録画面から
PDFをアップロードしてAIに読み取らせた結果（要約・全文テキスト）を書き出したものなので、
APIキーがなくても同じデモデータを再現できます。
同じタイトルが既にあれば追加しないため、何度実行しても件数は増えません。

添付PDFはあえて圧縮していません。Ghostscriptで圧縮するとサイズは半分になりますが、
日本語のグリフが一部欠落してテキスト抽出結果が壊れる（「テスト方針」→「テスト 針」）ため、
AIが読み取る原本としては使えないからです。

### 4. 起動する

```bash
npm run dev
```

<http://localhost:3000> を開き、デモアカウントでログインしてください。

- ID: `demo@shincha.local`
- パスワード: `password123`

本番相当のビルド・起動は以下の通りです。

```bash
npm run build
npm run start
```

その他のコマンド:

| コマンド           | 用途                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| `npm run db:reset` | ローカルDBを作り直してマイグレーションを再適用する（ローカル専用）       |
| `npm run db:types` | スキーマからTypeScriptの型を再生成する（マイグレーションを足したら実行） |

## Cloudflare Workers へのデプロイ

[OpenNext](https://opennext.js.org/cloudflare)（`@opennextjs/cloudflare`）で Cloudflare Workers に載せています。
設定は [wrangler.jsonc](./wrangler.jsonc) と [open-next.config.ts](./open-next.config.ts) です。

```bash
npx wrangler login

# 秘密は Worker の secret として登録する（コードやリポジトリには入れない）
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ANTHROPIC_API_KEY

npm run deploy
```

- `npm run preview` で、Cloudflare と同じランタイム（workerd）をローカルで起動できます。
  このときの秘密は `.dev.vars`（`.gitignore` 済み）に `.env.local` と同じ形式で書きます。
- デプロイ後、Supabase の Authentication > URL Configuration に公開URLを追加してください。
- OpenNext はビルド時に `.env.local` の中身も Worker のコードへ埋め込みます。秘密がデプロイされる
  コードに入らないよう、`npm run cf:build` では [scripts/strip-server-env.mjs](./scripts/strip-server-env.mjs) で
  `NEXT_PUBLIC_` 以外の値を取り除いています。
- Next.js 16 の `proxy.ts`（Node.js ランタイム）は、OpenNext では実験的サポートの扱いです。
- Supabase の無料プランは、DBへのリクエストが7日間ないとプロジェクトを一時停止します。
  [custom-worker.ts](./custom-worker.ts) で OpenNext の Worker を包み、Cron Trigger で毎日1回だけ
  軽い読み取りを送っています（2027年8月末まで。期限を過ぎると何もしません）。

## 設計上の判断

- **所属部門の選択**：新規登録の直後に表示します。所属が未設定のままログインした
  ユーザーも自動的にこの画面へ誘導します。所属は設定画面からも変更できます。
- **パスワードのリセット**：メール送信によるリセットは今回のスコープ外とし、
  `/login/forgot` で管理者に依頼するよう案内しています。
- **部門をまたいだ閲覧**：業務内容は全員が全部門のものを閲覧できます（部門タブで絞り込み可能）。
  他部門の手続きを調べたい場面があるためです。権限を分ける場合は
  `src/components/EntryListPage.tsx` のクエリ条件に絞り込みを追加します。
- **マニュアルと業務内容の統合**：当初は別画面として設計していましたが、
  「業務内容」に統合しました。旧URL（`/manual`）は業務内容へリダイレクトします。

## Supabaseの設計メモ

### どこで権限を確認しているか

RLSのポリシーは `supabase/migrations/20260909000003_rls_policies.sql` にまとめてあり、
画面側の出し分けと同じ条件をDBにも持たせています。

| 対象                         | 誰が読めるか     | 誰が書けるか                                     |
| ---------------------------- | ---------------- | ------------------------------------------------ |
| 業務内容・添付               | ログイン済み全員 | 先輩・管理者のみ                                 |
| 会話・メッセージ・ToDo・メモ | 本人のみ         | 本人のみ                                         |
| 予定                         | 同じ部門         | 同じ部門                                         |
| みんなのメモ                 | 同じ部門         | 共有は本人、編集・削除は書いた本人と先輩・管理者 |
| いいね                       | 本人の行のみ     | 本人のみ                                         |

画面側でも `getCurrentUser()` で確認してから描画しています。Next.jsのレイアウトや
proxy の `redirect` はページの描画自体を止めないため、そこに認可を任せると
未ログインでもレスポンス本文に中身が載ってしまうためです。

### セッションの更新

認証Cookieの発行・更新は Supabase Auth が行い、トークンの更新は
[src/proxy.ts](./src/proxy.ts) で行っています（Next.js 16 で `middleware` から `proxy` に改称されたもの）。

### RPC（DB側の関数）を使っている3か所

ポリシーだけでは表せない処理は、DBの関数に寄せています。

- `toggle_shared_note_like` … いいねの付け外し。いいねが付いたとき「書いた人」の
  経験値を増やす必要があり、他人のプロフィールは通常のポリシーでは更新できないため。
- `question_trend` … 質問の傾向グラフ。チャットの本文は本人しか読めないので、
  先輩・管理者がメンバーのグラフを見るときも「どの資料を何回参照したか」だけを返す。
- `add_xp` … 経験値の加算。「1日4問まで」などの上限はServer Action側で見ているので、
  ユーザーから直接呼べないよう `service_role` にだけ実行権限を与えている。

### いいねの匿名性

誰が押したかは画面に出しません。`shared_note_likes` の行そのものも本人しか読めない
ようにしてあり、一覧に出す件数は `shared_notes.like_count`（トリガで同期）を使います。

### 先輩・管理者の作り方

役割は**新規登録画面で本人が選びます**（新人 / 先輩・管理者）。先輩・管理者は業務内容の
登録・削除とメンバー管理ができます。あとから設定 > メンバー管理で、既にいる管理者が
昇格・降格させることもできます。

`profiles.role` は本人には変えられないようにしてある（`guard_profile_privileges`
トリガ）ので、登録時に選んだ役割はサーバー側の管理用クライアントから設定しています。
つまり画面から役割を変える経路は「登録時に選ぶ」「管理者が変える」の2つだけです。

> 登録時は自己申告なので、誰でも先輩・管理者として登録できます。実際の社内で運用する場合は、
> 招待制にするなど別途の制限が要ります。

### アカウント削除

「その人だけのもの」と「チームで使うもの」の振り分けは、外部キーの `on delete` に
持たせてあります。`auth.users` を1行消すと、会話・メッセージ・添付・ToDo・メモ・
いいね・非表示は cascade で消え、業務内容・予定・みんなのメモは登録者が null に
なって残ります（「退会したユーザー」と表示されます）。

## ディレクトリ構成（抜粋）

```
supabase/migrations/       スキーマ・関数・RLSポリシー（番号順に適用される）
supabase/seed.ts           デモデータ投入スクリプト
supabase/seed-data/        デモ用の業務内容・みんなのメモ（JSON＋添付PDF）
src/proxy.ts               Supabaseのトークン更新（旧 middleware）
src/lib/supabase/          Supabaseクライアント（本人用 / 管理用）と生成した型
src/lib/auth.ts            ログイン中のユーザーの取得
src/lib/claudeAgent.ts     Claudeの呼び出し（資料の読み取り・チャット回答・メモの要約）
src/lib/retrieval.ts       業務内容の簡易検索（候補の絞り込み）
src/app/actions/*.ts       Server Actions（フォーム送信の処理）
src/app/(app)/*            ログイン後の画面（ホーム・業務内容・チャット等）
src/app/login, /signup     ログイン・新規登録
src/app/onboarding/team    所属選択画面
```

画面ごとの詳細な仕様は [仕様書.md](./仕様書.md) にあります。

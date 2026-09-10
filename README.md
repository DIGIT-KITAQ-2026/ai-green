# 新-cha-

[仕様書.md](./仕様書.md) の内容に沿って実装した、新人向け業務内容サポートアプリです。
チャット・写真・PDFを送るだけでAI（Claude）が業務内容を読み取り、社内に蓄積された
業務内容から適切なものを選んで回答します。PCのWebブラウザからアクセスする前提の
Webアプリです。

## 技術構成

| 領域 | 採用技術 |
|---|---|
| フレームワーク | Next.js 16（App Router）+ TypeScript |
| スタイル | Tailwind CSS（仕様書のトーン＆マナーに合わせた茶色・宇治抹茶色パレット） |
| データベース | Supabase（PostgreSQL）。テーブルはRLS（行レベルセキュリティ）で保護 |
| ファイル | Supabase Storage（`attachments` バケット）。画像・PDFの実体はここに置く |
| 認証 | Supabase Auth（メールアドレス＋パスワード） |
| AI | Claude Agent SDK（`@anthropic-ai/claude-agent-sdk`）経由でClaude Codeを起動 |

**AIの呼び出し方針**：従量課金のAnthropic API（`ANTHROPIC_API_KEY`）は使用しません。
代わりに [src/lib/claudeAgent.ts](./src/lib/claudeAgent.ts) で `@anthropic-ai/claude-agent-sdk`
の `query()` を使い、アプリからClaude Code本体を1回限りのセッションとして起動しています。
認証はこのアプリを動かすマシンにログイン済みのClaude Codeセッション（`claude login`、
サブスクリプション認証）をそのまま利用します。呼び出しごとにツール（ファイル操作・Bash等）は
すべて無効化し、プロジェクト設定（CLAUDE.md等）も読み込まない隔離モードにしているため、
単発の質問応答・資料読み取り以外のことはできないようにしています。

仕様書10章の「AI連携仕様」に対応する部分は [src/lib/claudeAgent.ts](./src/lib/claudeAgent.ts) に実装しています。
候補の絞り込み（本来はベクトル検索/RAGを想定）は、外部の埋め込みAPIを追加しない
MVP実装として、文字bi-gramによる簡易な類似度スコアリングで代替しています
（[src/lib/retrieval.ts](./src/lib/retrieval.ts)）。将来的に本格的なベクトルDBへ
差し替える場合も、呼び出し側のインターフェースは変更不要です。

## セットアップ

```bash
npm install
```

### 1. Supabase を用意する

ローカルで動かす場合は Docker と [Supabase CLI](https://supabase.com/docs/guides/cli) が必要です。

```bash
supabase start
```

起動時に表示される `API URL` / `ANON_KEY` / `SERVICE_ROLE_KEY` を `.env.local` に書きます。

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=（start が表示した ANON_KEY）
SUPABASE_SERVICE_ROLE_KEY=（start が表示した SERVICE_ROLE_KEY）
```

クラウドのプロジェクトに繋ぐ場合は、Project Settings > API の値を同じ3つに入れ、
`supabase link` のうえ `supabase db push` でマイグレーションを適用してください。
`SUPABASE_SERVICE_ROLE_KEY` はRLSを通さない鍵なので、サーバー側だけで使い、
絶対に公開しないでください（このアプリではアカウント削除・利用停止・シード投入にのみ使っています）。

AIを使う機能（チャット回答・登録内容の解析）を動かすには、**このアプリを実行する
マシン上で事前に一度だけ** `claude login` を実行し、Claude Codeにログインしておいて
ください。ANTHROPIC_API_KEYの設定は不要です。ログインしていない場合でもアプリ自体は
動作しますが、AI関連の処理は「AIに接続できませんでした」という案内が表示されます。

```bash
claude login
```

### 2. スキーマと初期データ

スキーマは `supabase/migrations/` の4本＋補助2本で作られます。`supabase start` /
`npm run db:reset` の時点で自動的に適用されるので、あとは初期データを流すだけです。

```bash
npm run db:seed
```

`db:seed` で入るもの:

- 所属部門4件（人事 / 総務 / 経理 / 法務）
- デモアカウント（`demo@shincha.local` / `password123`、先輩・管理者、Lv8）
- デモ用の業務内容32件（PDF添付つき／4部門分）
- デモ用のみんなのメモ8件

その他のコマンド:

| コマンド | 用途 |
|---|---|
| `npm run db:reset` | ローカルDBを作り直してマイグレーションを再適用する |
| `npm run db:types` | スキーマからTypeScriptの型を再生成する（マイグレーションを足したら実行） |

デモ用の業務内容は `supabase/seed-data/` に置いています。実際に登録画面から
PDFをアップロードしてAIに読み取らせた結果（要約・全文テキスト）を書き出したものなので、
`claude login` が済んでいない環境でも同じデモデータを再現できます。
同じタイトルが既にあれば追加しないため、`db:seed` は何度実行しても増えません。

添付PDFは圧縮していません。Ghostscriptで圧縮するとサイズは半分になりますが、
日本語のグリフが一部欠落してテキスト抽出結果が壊れる（「テスト方針」→「テスト 針」）ため、
AIが読み取る原本としては使えないためです。

開発サーバーを起動します。

```bash
npm run dev
```

<http://localhost:3000> をブラウザで開いてください。デモアカウントでログインできます。

- ID: `demo@shincha.local`
- パスワード: `password123`

本番相当のビルド・起動は以下の通りです。

```bash
npm run build
npm run start
```

> **セッションについて**：認証Cookieの発行・更新は Supabase Auth が行います。
> トークンの更新は [src/proxy.ts](./src/proxy.ts)（Next.js 16 では `middleware` が
> `proxy` に改称）で行っています。

## 画面と仕様書の対応

| 画面 | 実装 | 仕様書の章 |
|---|---|---|
| ログイン | `/login` | 3章 |
| 所属選択 | `/onboarding/team`（新規登録直後）、`/settings`（変更） | 4章 |
| ホーム | `/` | 5章 |
| 業務内容 | `/tasks`, `/tasks/[id]`, `/tasks/new` | 6章, 7章, 9.1節（マニュアルと統合） |
| チャット | `/chat`, `/chat/[id]` | 8章 |
| みんなのメモ | `/team-notes`, `/team-notes/[id]` | （追加機能） |
| カレンダー・ToDo | `/calendar` | （追加機能） |
| 設定 | `/settings` | 9.2節 |

新規登録（サインアップ）は `/signup` です。仕様書のログイン画面にある
「新規登録はこちら」ボタンから遷移し、完了後は所属選択画面に進みます。

## 実装メモ・仕様書からの変更点

仕様書13章「未確定事項」を踏まえ、実装にあたって以下の通り判断しました。

- **所属選択画面**：新規登録直後のみ表示する仕様としました（`teamId` が未設定の
  ユーザーがログインした場合も自動的にこの画面へ誘導されます）。所属は設定画面からも
  変更できます。
- **パスワードを忘れた方はこちら**：メール送信によるリセットは未実装です。
  `/login/forgot` に、管理者へ依頼する旨の案内ページを用意しました。
- **チーム横断の閲覧権限**：MVPでは全ユーザーが全チームの業務内容・マニュアルを
  閲覧できる仕様にしています（チームタブによる絞り込みは可能）。権限を分ける場合は
  `src/components/EntryListPage.tsx` のクエリ条件に絞り込みを追加してください。
- **マニュアル・設定画面**：手書き資料に個別の下描きがなかったため、業務内容画面・
  ホーム画面から類推したレイアウトで実装しています。

## ディレクトリ構成（抜粋）

```
supabase/migrations/       スキーマ・関数・RLSポリシー（番号順に適用される）
supabase/seed.ts           初期データ投入スクリプト
supabase/seed-data/        デモ用の業務内容・みんなのメモ（JSON＋添付PDF）
src/proxy.ts               Supabaseのトークン更新（旧 middleware）
src/lib/supabase/          Supabaseクライアント（本人用 / 管理用）と生成した型
src/lib/auth.ts            ログイン中のユーザーの取得
src/lib/claudeAgent.ts     Claude Agent SDK呼び出し（登録内容の解析・チャット回答）
src/lib/retrieval.ts       業務内容の簡易検索（候補の絞り込み）
src/app/actions/*.ts       Server Actions（フォーム送信の処理）
src/app/(app)/*            ログイン後の画面（ホーム・業務内容・チャット等）
src/app/login, /signup     ログイン・新規登録
src/app/onboarding/team    所属選択画面
```

## Supabaseの設計メモ

### どこで権限を確認しているか

RLSのポリシーは `supabase/migrations/20260909000003_rls_policies.sql` にまとめてあり、
画面側の出し分けと同じ条件をDBにも持たせています。

| 対象 | 誰が読めるか | 誰が書けるか |
|---|---|---|
| 業務内容・添付 | ログイン済み全員 | 先輩・管理者のみ |
| 会話・メッセージ・ToDo・メモ | 本人のみ | 本人のみ |
| 予定 | 同じ部門 | 同じ部門 |
| みんなのメモ | 同じ部門 | 共有は本人、編集・削除は書いた本人と先輩・管理者 |
| いいね | 本人の行のみ | 本人のみ |

画面側でも `getCurrentUser()` で確認してから描画しています。Next.jsのレイアウトや
proxy の `redirect` はページの描画自体を止めないため、そこに認可を任せると
未ログインでもレスポンス本文に中身が載ってしまうためです。

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

> 登録時は自己申告なので、誰でも先輩・管理者として登録できます。社外の人が登録できる
> 場所に置く場合は、招待制にするなど別途の制限が要ります。

### アカウント削除

「その人だけのもの」と「チームで使うもの」の振り分けは、外部キーの `on delete` に
持たせてあります。`auth.users` を1行消すと、会話・メッセージ・添付・ToDo・メモ・
いいね・非表示は cascade で消え、業務内容・予定・みんなのメモは登録者が null に
なって残ります（「退会したユーザー」と表示されます）。

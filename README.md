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
| データベース | SQLite（Prisma ORM）。画像・PDFの実体もDBに直接保存 |
| 認証 | ID・パスワード（bcryptによるハッシュ化）+ 署名付きCookieセッション |
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
cp .env.example .env
```

`.env` の `SESSION_SECRET` を、適当な長いランダム文字列に変更してください
（ログインセッションの署名に使います）。

AIを使う機能（チャット回答・登録内容の解析）を動かすには、**このアプリを実行する
マシン上で事前に一度だけ** `claude login` を実行し、Claude Codeにログインしておいて
ください。ANTHROPIC_API_KEYの設定は不要です。ログインしていない場合でもアプリ自体は
動作しますが、AI関連の処理は「AIに接続できませんでした」という案内が表示されます。

```bash
claude login
```

データベースを作成し、初期データ（所属チーム3件・デモアカウント）を投入します。

```bash
npm run db:push
npm run db:seed
```

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

> **HTTPS運用について**：本番ビルド（`NODE_ENV=production`）ではセッションCookieに
> `Secure` 属性を付与しています。実運用ではリバースプロキシ等でHTTPS終端をしてください。

## 画面と仕様書の対応

| 画面 | 実装 | 仕様書の章 |
|---|---|---|
| ログイン | `/login` | 3章 |
| 所属選択 | `/onboarding/team`（新規登録直後）、`/settings`（変更） | 4章 |
| ホーム | `/` | 5章 |
| 業務内容 | `/tasks`, `/tasks/[id]`, `/tasks/new` | 6章, 7章 |
| マニュアル | `/manual`, `/manual/[id]`, `/manual/new` | 9.1節（業務内容と共通コンポーネントを使用） |
| チャット | `/chat` | 8章 |
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
prisma/schema.prisma       データベース定義
prisma/seed.ts             初期データ投入スクリプト
src/lib/auth.ts            認証・セッション
src/lib/claudeAgent.ts     Claude Agent SDK呼び出し（登録内容の解析・チャット回答）
src/lib/retrieval.ts       業務内容の簡易検索（候補の絞り込み）
src/app/actions/*.ts       Server Actions（フォーム送信の処理）
src/app/(app)/*            ログイン後の画面（ホーム・業務内容・チャット等）
src/app/login, /signup     ログイン・新規登録
src/app/onboarding/team    所属選択画面
```

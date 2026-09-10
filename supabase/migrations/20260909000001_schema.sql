-- 新-cha- のスキーマ。
--
-- Prisma + SQLite から移行したもの。対応は次のとおり。
--   User        -> profiles（ログインIDとパスワードは auth.users が持つ）
--   TaskEntry   -> task_entries
--   Attachment  -> attachments（ファイル本体はStorageへ。DBにはパスだけ持つ）
--   SharedNote  -> shared_notes
-- 列名はPostgresの慣習に合わせて snake_case にしている。

create extension if not exists pgcrypto;

-- 所属チーム（所属選択画面 / 業務内容の分類に使用）
create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- ユーザー。ログインIDとパスワードは auth.users 側が持つので、
-- ここにはアプリが使う属性だけを置く。
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  name               text not null default '',
  role               text not null default 'member' check (role in ('member', 'admin')),
  team_id            uuid references public.teams(id),
  -- 育成要素。質問・ToDo消化・いいね獲得で貯まる（src/lib/rewards.ts）。
  xp                 integer not null default 0,
  -- 選択中のキャラクター。IDは rewards.ts のカタログを指す。
  selected_reward_id text,
  -- 退職者などのアカウントを止めるためのフラグ。
  -- 消すと本人が書いた共有メモの作者表示などが失われるため、
  -- 「消す」ではなく「入れなくする」を管理者に持たせている。
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- チャットの会話（スレッド）。過去の会話を残したまま新しい会話を始められる。
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null, -- 最初の質問から自動で付ける見出し
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);

-- 業務内容のエントリ（登録画面から作成、業務内容画面に一覧表示）。
create table public.task_entries (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  team_id    uuid not null references public.teams(id),
  summary    text not null,  -- AIが生成した要約（一覧・チャット回答で使用）
  raw_text   text not null,  -- 添付から抽出したテキスト全文（検索対象）
  -- 退会しても資料はチームに残すため、登録者は任意（退会時は null）。
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index task_entries_team_idx on public.task_entries (team_id, created_at desc);

-- チャットのメッセージ（質問 / AIの回答）
create table public.chat_messages (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  conversation_id          uuid not null references public.conversations(id) on delete cascade,
  role                     text not null check (role in ('user', 'assistant')),
  text                     text not null,
  -- AIが回答の根拠にした業務内容。資料が消えても会話は残すため on delete set null。
  referenced_task_entry_id uuid references public.task_entries(id) on delete set null,
  created_at               timestamptz not null default now()
);
create index chat_messages_conversation_idx on public.chat_messages (conversation_id, created_at);
create index chat_messages_user_created_idx on public.chat_messages (user_id, created_at);

-- アップロードされた画像・PDF。本体はStorageの attachments バケットに置き、
-- ここにはその中のパスだけを持つ（SQLiteにBytesで持っていたのをやめた）。
create table public.attachments (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('image', 'pdf')),
  filename        text not null,
  mime_type       text not null,
  storage_path    text not null,
  ocr_text        text, -- このファイル単体から抽出したテキスト
  task_entry_id   uuid references public.task_entries(id) on delete cascade,
  chat_message_id uuid references public.chat_messages(id) on delete cascade,
  created_at      timestamptz not null default now(),
  -- 業務内容かチャットのどちらか一方にぶら下がる。
  constraint attachments_owner_check check (
    (task_entry_id is not null and chat_message_id is null)
    or (task_entry_id is null and chat_message_id is not null)
  )
);
create index attachments_task_entry_idx on public.attachments (task_entry_id);
create index attachments_chat_message_idx on public.attachments (chat_message_id);

-- カレンダーの予定。チーム単位で共有し、研修や締め日、定例会議などを置く。
create table public.events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  -- 日付のみを扱う（時刻は start_time に文字列で持たせ、未入力なら終日扱い）。
  date       date not null,
  start_time text, -- "09:30" 形式。未入力なら終日の予定
  note       text,
  team_id    uuid not null references public.teams(id) on delete cascade,
  -- 退会しても予定はチームに残すため、登録者は任意。
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index events_team_date_idx on public.events (team_id, date);

-- ToDo。自分のやることを管理するため、ユーザーごとに持つ。
create table public.todos (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  due_date      date,
  done          boolean not null default false,
  completed_at  timestamptz,
  -- 経験値を付けた日時。最初に完了したとき1回だけ付ける（付け直しで増えない）。
  -- 1日に何件加算したかを数えるのに使うので、真偽値ではなく日時で持つ。
  xp_awarded_at timestamptz,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index todos_user_idx on public.todos (user_id, done, due_date);

-- メモ。気づいたことをその場で書き留めるためのもの。ユーザーごとに持つ。
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_updated_idx on public.notes (user_id, updated_at desc);

-- チャットのやり取りをAIが要約し、チームの共有ナレッジとして残したもの。
-- 個人の notes と違い、同じチームの全員が読める。
create table public.shared_notes (
  id      uuid primary key default gen_random_uuid(),
  title   text not null,
  body    text not null, -- AIが作った要約
  team_id uuid not null references public.teams(id) on delete cascade,
  -- 退会しても共有ナレッジはチームに残すため、作成者は任意。
  author_id uuid references public.profiles(id) on delete set null,
  -- 表示と並び替えに使う「役に立った」の数。likes 側のトリガで更新する。
  -- 件数をここに持つことで、誰が押したかを読めるようにしなくても件数を出せる。
  like_count integer not null default 0,
  -- これまでに経験値を渡した「他人からのいいね」の数。
  -- ここまでの分は渡し済みとして、増えた差分だけ書いた人に加算する。
  xp_awarded_likes integer not null default 0,
  -- 元になった会話。同じ会話を二重に共有しないよう一意にしている。
  conversation_id uuid unique references public.conversations(id) on delete set null,
  -- 回答の根拠になった業務内容。読んだ人が原典に当たれるようにする。
  referenced_task_entry_id uuid references public.task_entries(id) on delete set null,
  -- もとになった質問文。チャットの検索で「その言い方をした人はこの資料に辿り着いた」
  -- という手がかりに使うため、質問文だけ別に持っておく。
  source_questions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 人が手を入れたかどうか。AIの要約のままか、誰かが直したものかを読む側に示す。
  edited_at  timestamptz
);
create index shared_notes_team_idx on public.shared_notes (team_id, like_count desc, created_at desc);

-- みんなのメモへの「いいね」。誰が押したかは画面に一切出さない（匿名）。
-- 行そのものも本人以外は読めないようにし、件数は shared_notes.like_count で見せる。
create table public.shared_note_likes (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.shared_notes(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (note_id, user_id)
);
create index shared_note_likes_note_idx on public.shared_note_likes (note_id);

-- 自分には必要ないと判断したメモを、自分の画面でだけ下げるための記録。
-- チームの共有物そのものは消さず、見え方だけを個人ごとに変える。
create table public.shared_note_hides (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.shared_notes(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (note_id, user_id)
);
create index shared_note_hides_user_idx on public.shared_note_hides (user_id);

-- テーブルへのアクセス権。
-- Supabase では「権限は開けておき、行の絞り込みはRLSでやる」形になっているので、
-- ログイン済みロールに一通り渡したうえで、次のマイグレーションのポリシーで絞る。
-- anon（未ログイン）には何も渡さない。ログイン前に触れる画面が無いため。
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

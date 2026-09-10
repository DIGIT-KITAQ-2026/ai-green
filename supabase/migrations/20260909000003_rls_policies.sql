-- 行レベルセキュリティ。画面側の出し分けと同じ条件をDBにも持たせる。
--
-- 方針:
--   ・自分のもの（会話・ToDo・メモ）は本人だけ
--   ・チームで共有するもの（予定・みんなのメモ）は同じチームだけ
--   ・業務内容は全員が読め、登録と削除は先輩・管理者だけ
--   ・いいねは押した本人しか行を読めない（件数は shared_notes.like_count で見せる）

alter table public.teams              enable row level security;
alter table public.profiles           enable row level security;
alter table public.conversations      enable row level security;
alter table public.task_entries       enable row level security;
alter table public.chat_messages      enable row level security;
alter table public.attachments        enable row level security;
alter table public.events             enable row level security;
alter table public.todos              enable row level security;
alter table public.notes              enable row level security;
alter table public.shared_notes       enable row level security;
alter table public.shared_note_likes  enable row level security;
alter table public.shared_note_hides  enable row level security;

-- チーム: 所属選択で全部出すので、誰でも読める。増減はシード（service role）から。
create policy "teams are readable" on public.teams
  for select to authenticated using (true);

-- プロフィール: 作者名やメンバー管理で他人の行も読む必要がある。
create policy "profiles are readable" on public.profiles
  for select to authenticated using (true);
create policy "own profile is updatable" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy "admins can update profiles" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 役割と停止フラグは本人には変えさせない。
-- update ポリシーの with check だけでは変更前の値と比べられないため、トリガで見る。
-- service role（シードやサーバー側の処理）は auth.uid() が無いので対象外にする。
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception '役割と利用停止を変更できるのは先輩・管理者だけです';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- 業務内容: 全員が読める（チャットの回答も全チームの資料から探す）。
-- 登録と削除は先輩・管理者だけ。
create policy "task entries are readable" on public.task_entries
  for select to authenticated using (true);
create policy "admins manage task entries" on public.task_entries
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 添付: 中身は /api/files/[id] 経由で返すので、行は誰でも読める。
-- 業務内容にぶら下がる分は管理者、チャットにぶら下がる分は本人が作る。
create policy "attachments are readable" on public.attachments
  for select to authenticated using (true);
create policy "admins add task entry attachments" on public.attachments
  for insert to authenticated
  with check (task_entry_id is not null and public.is_admin());
create policy "users add own chat attachments" on public.attachments
  for insert to authenticated
  with check (
    chat_message_id is not null
    and exists (
      select 1 from public.chat_messages m
      where m.id = chat_message_id and m.user_id = (select auth.uid())
    )
  );
create policy "admins delete attachments" on public.attachments
  for delete to authenticated using (public.is_admin());

-- 会話とメッセージ: 本人だけ。
create policy "own conversations" on public.conversations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own chat messages" on public.chat_messages
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ToDoとメモ: 本人だけ。
create policy "own todos" on public.todos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own notes" on public.notes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 予定: 同じチームなら誰でも読み書きできる（研修や締め日をチームで持ち合うため）。
create policy "team events are readable" on public.events
  for select to authenticated using (team_id = public.my_team_id());
create policy "team members add events" on public.events
  for insert to authenticated
  with check (team_id = public.my_team_id() and created_by = (select auth.uid()));
create policy "team members remove events" on public.events
  for delete to authenticated using (team_id = public.my_team_id());

-- みんなのメモ: 同じチームが読む。直せるのは書いた本人と先輩・管理者。
create policy "team shared notes are readable" on public.shared_notes
  for select to authenticated using (team_id = public.my_team_id());
create policy "users share own notes" on public.shared_notes
  for insert to authenticated
  with check (team_id = public.my_team_id() and author_id = (select auth.uid()));
create policy "author or admin edits shared notes" on public.shared_notes
  for update to authenticated
  using (team_id = public.my_team_id() and (author_id = (select auth.uid()) or public.is_admin()))
  with check (team_id = public.my_team_id());
create policy "author or admin deletes shared notes" on public.shared_notes
  for delete to authenticated
  using (team_id = public.my_team_id() and (author_id = (select auth.uid()) or public.is_admin()));

-- いいね: 匿名なので、誰が押したかは本人以外に読ませない。
-- 画面に出す件数は shared_notes.like_count（トリガで同期）を使う。
create policy "own likes" on public.shared_note_likes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.shared_notes n
      where n.id = note_id and n.team_id = public.my_team_id()
    )
  );

-- 非表示: 自分の画面の見え方なので、本人だけ。
create policy "own hides" on public.shared_note_hides
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

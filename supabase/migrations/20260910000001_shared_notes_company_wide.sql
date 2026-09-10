-- みんなのメモを全部門で共有できるようにする。
--
-- もとは自分の所属チームのメモしか読めなかったが、
-- 人事のナレッジが総務の人に届かず、部門をまたぐ質問（総務の人が経理の請求書ルールを
-- 見るなど）に使えなかった。業務内容は最初から全部門が読める作りなので、
-- みんなのメモだけがチームに閉じているのは画面の作りとしても揃っていなかった。
--
-- 読むのは全員。書き換えられるのは、これまでどおり書いた本人と先輩・管理者だけ。
-- shared_notes.team_id は「どの部門が貯めたメモか」を表す分類として残す。

drop policy if exists "team shared notes are readable" on public.shared_notes;
create policy "shared notes are readable" on public.shared_notes
  for select to authenticated using (true);

-- 共有するときは自分のチームのメモとして入れる（分類なので所属で決まる）。
drop policy if exists "users share own notes" on public.shared_notes;
create policy "users share own notes" on public.shared_notes
  for insert to authenticated
  with check (team_id = public.my_team_id() and author_id = (select auth.uid()));

-- 直せる・消せるのは書いた本人と先輩・管理者。部門は問わない
-- （誤った内容が全社に見えるようになるため、管理者はどの部門のものでも直せる）。
drop policy if exists "author or admin edits shared notes" on public.shared_notes;
create policy "author or admin edits shared notes" on public.shared_notes
  for update to authenticated
  using (author_id = (select auth.uid()) or public.is_admin())
  with check (true);

drop policy if exists "author or admin deletes shared notes" on public.shared_notes;
create policy "author or admin deletes shared notes" on public.shared_notes
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

-- いいねもどの部門のメモにも押せる。誰が押したかを読めないのは変わらない。
drop policy if exists "own likes" on public.shared_note_likes;
create policy "own likes" on public.shared_note_likes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- RPC側のチーム条件も外す。
create or replace function public.toggle_shared_note_like(p_note_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id   uuid := (select auth.uid());
  v_note      public.shared_notes;
  v_existing  uuid;
  v_others    integer;
  v_new_likes integer;
  xp_per_like constant integer := 10;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です';
  end if;

  select * into v_note from public.shared_notes where id = p_note_id;
  if not found then
    raise exception 'メモが見つかりません';
  end if;

  select id into v_existing from public.shared_note_likes
   where note_id = p_note_id and user_id = v_user_id;

  if v_existing is not null then
    delete from public.shared_note_likes where id = v_existing;
    return false;
  end if;

  insert into public.shared_note_likes (note_id, user_id) values (p_note_id, v_user_id);

  -- 退会したユーザーのメモには渡す先が無い。
  if v_note.author_id is null then
    return true;
  end if;

  select count(*) into v_others from public.shared_note_likes
   where note_id = p_note_id and user_id <> v_note.author_id;

  v_new_likes := v_others - v_note.xp_awarded_likes;
  if v_new_likes > 0 then
    update public.shared_notes
       set xp_awarded_likes = v_others
     where id = p_note_id;
    update public.profiles
       set xp = xp + (v_new_likes * xp_per_like)
     where id = v_note.author_id;
  end if;

  return true;
end;
$$;

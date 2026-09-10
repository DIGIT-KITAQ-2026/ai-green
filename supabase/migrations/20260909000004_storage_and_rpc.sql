-- 添付ファイルの置き場と、他人の行に触る必要がある操作のRPC。

-- 添付ファイル。非公開バケットにして、中身はアプリの /api/files/[id] から返す。
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- パスの決め方:
--   task-entries/<業務内容ID>/<ファイル名>  … 登録できるのは先輩・管理者だけ
--   chat/<ユーザーID>/<ファイル名>          … 本人だけ
create policy "attachments are readable" on storage.objects
  for select to authenticated using (bucket_id = 'attachments');

create policy "admins upload task entry files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = 'task-entries'
    and public.is_admin()
  );

create policy "users upload own chat files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = 'chat'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "admins delete attachment files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and public.is_admin());

-- いいねの付け外し。
--
-- RPCにしているのは、いいねが付いたときに「書いた人」のXPを増やす必要があるため。
-- 通常のポリシーでは他人の profiles を更新できないので、ここで一括して行う。
--
-- XPは押した側ではなく書いた側に入る。自分で自分のメモに押した分は数えない。
-- 渡し済みの数を shared_notes.xp_awarded_likes に残し、増えた差分だけ加算するので、
-- いいねを外して押し直しても二重には入らない。
--
-- 1いいねあたりのXPは src/lib/rewards.ts の XP_RULES.noteLikeReceived と同じ値。
-- 片方だけ変えないこと。ここを引数にしないのは、呼び出し側から好きな値を
-- 渡せてしまうため。
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

  -- 同じチームのメモにしか押せない。
  select * into v_note from public.shared_notes
   where id = p_note_id and team_id = public.my_team_id();
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

revoke all on function public.toggle_shared_note_like(uuid) from public;
grant execute on function public.toggle_shared_note_like(uuid) to authenticated;

-- ポリシーから使うヘルパーと、アプリが前提にしている自動更新のトリガ。

-- 自分が管理者（先輩）かどうか。
-- security definer にしているのは、ポリシーの中から profiles を読むと
-- profiles 自身のポリシーが再帰的に効いてしまうため。
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- 自分の所属チーム。チーム単位で見せるもの（予定・みんなのメモ）の判定に使う。
create or replace function public.my_team_id()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select team_id from public.profiles where id = (select auth.uid());
$$;

-- updated_at を更新のたびに進める（Prismaの @updatedAt に相当）。
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger conversations_touch_updated_at
  before update on public.conversations
  for each row execute function public.touch_updated_at();
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();
create trigger shared_notes_touch_updated_at
  before update on public.shared_notes
  for each row execute function public.touch_updated_at();

-- 新規登録時に profiles の行を作る。
-- 表示名は signUp の options.data.name から受け取る。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- いいねの件数を shared_notes 側に持たせる。
-- 誰が押したかを読めるようにしなくても件数を出せるようにするため
-- （いいねは匿名なので、行そのものは本人しか読めない）。
create or replace function public.sync_shared_note_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.shared_notes
      set like_count = like_count + 1
      where id = new.note_id;
    return new;
  else
    update public.shared_notes
      set like_count = greatest(like_count - 1, 0)
      where id = old.note_id;
    return old;
  end if;
end;
$$;

create trigger shared_note_likes_sync_count
  after insert or delete on public.shared_note_likes
  for each row execute function public.sync_shared_note_like_count();

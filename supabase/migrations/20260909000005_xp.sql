-- 経験値の加算。
--
-- 「1日4問まで」「1日5件まで」といった上限はServer Action側で見ているので、
-- この関数がユーザーから直接呼べると上限をすり抜けられてしまう。
-- そのため実行権限は service_role だけに与え、アプリのサーバー側からしか
-- 呼べないようにしている（src/lib/xp.ts）。
--
-- いいねで書いた人に入る分だけは toggle_shared_note_like 側にある。
-- あちらは「同じ人の同じメモ」では二度と加算されないので、ユーザーから
-- 直接呼べても増やしようがなく、authenticated に開いてある。
create or replace function public.add_xp(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_xp integer;
begin
  update public.profiles
     set xp = xp + p_amount
   where id = p_user_id
  returning xp into v_xp;
  return v_xp;
end;
$$;

revoke all on function public.add_xp(uuid, integer) from public;
revoke all on function public.add_xp(uuid, integer) from anon;
revoke all on function public.add_xp(uuid, integer) from authenticated;
grant execute on function public.add_xp(uuid, integer) to service_role;

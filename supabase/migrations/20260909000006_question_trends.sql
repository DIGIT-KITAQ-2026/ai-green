-- 質問の傾向（回答が参照した業務内容ごとの件数）を数える。
--
-- チャットの本文は本人しか読めないようにしてあるので、
-- 先輩・管理者が同じチームのメンバーのグラフを見るには、
-- 集計だけを返すこの関数を通す。
-- 返すのは「どの資料を何回参照したか」だけで、質問文も回答文も出さない。
create or replace function public.question_trend(p_user_id uuid)
returns table (referenced_task_entry_id uuid, count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
begin
  if v_caller is null then
    raise exception 'ログインが必要です';
  end if;

  -- 見られるのは自分の分か、同じチームのメンバーの分（先輩・管理者のみ）。
  if v_caller <> p_user_id then
    if not public.is_admin() then
      raise exception '他の人の傾向を見られるのは先輩・管理者だけです';
    end if;
    if not exists (
      select 1 from public.profiles
      where id = p_user_id and team_id = public.my_team_id()
    ) then
      raise exception '同じチームのメンバーではありません';
    end if;
  end if;

  return query
    select m.referenced_task_entry_id, count(*)::bigint
      from public.chat_messages m
     where m.user_id = p_user_id and m.role = 'assistant'
     group by m.referenced_task_entry_id;
end;
$$;

revoke all on function public.question_trend(uuid) from public;
grant execute on function public.question_trend(uuid) to authenticated;

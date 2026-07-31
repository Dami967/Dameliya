-- Пользователь может удалить только собственную случайно созданную цель.
create or replace function public.delete_quest_plan(target_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare target_goal text;
begin
  select goal into target_goal from public.ai_quest_plans
    where id = target_id and user_id = auth.uid();
  if target_goal is null then raise exception 'Quest not found'; end if;

  delete from public.quest_task_records
    where user_id = auth.uid() and goal = target_goal;
  delete from public.ai_quest_plans
    where id = target_id and user_id = auth.uid();
end;
$$;
grant execute on function public.delete_quest_plan(uuid) to authenticated;

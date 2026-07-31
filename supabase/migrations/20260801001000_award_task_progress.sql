-- XP в интерфейсе отражает реальные выполненные задания пользователя.
create or replace function public.award_task_progress(points integer)
returns integer language plpgsql security definer set search_path = ''
as $$
declare new_xp integer;
begin
  update public.profiles
    set xp = xp + greatest(0, least(points, 1000)),
        completed_tasks = completed_tasks + 1,
        level = greatest(level, ((xp + greatest(0, least(points, 1000))) / 300) + 1)
  where user_id = auth.uid()
  returning xp into new_xp;
  return new_xp;
end;
$$;
grant execute on function public.award_task_progress(integer) to authenticated;

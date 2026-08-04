-- Завершает этап, обновляет карту и начисляет награды одной транзакцией.
-- Блокировка карты и проверка прежнего состояния делают повторный запрос безопасным.
create or replace function public.complete_quest_task(
  target_plan uuid,
  target_step integer,
  task_notes text,
  task_chat jsonb
)
returns table(newly_completed boolean, awarded_xp integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user uuid := auth.uid();
  plan_row public.ai_quest_plans%rowtype;
  current_step jsonb;
  step_position bigint;
  step_xp integer;
  next_steps jsonb;
begin
  if current_user is null then raise exception 'Authentication required'; end if;
  if target_step not between 1 and 100 then raise exception 'Invalid step'; end if;
  if char_length(coalesce(task_notes, '')) > 20000 then raise exception 'Notes are too long'; end if;
  if task_chat is null or jsonb_typeof(task_chat) <> 'array' then raise exception 'Invalid chat'; end if;

  select * into plan_row from public.ai_quest_plans
  where id = target_plan and user_id = current_user
  for update;
  if not found then raise exception 'Quest not found'; end if;

  select value, ordinality into current_step, step_position
  from jsonb_array_elements(plan_row.steps) with ordinality
  where (value->>'id')::integer = target_step
  limit 1;
  if current_step is null then raise exception 'Step not found'; end if;

  newly_completed := coalesce(current_step->>'state', '') <> 'done';
  step_xp := case when coalesce(current_step->>'xp', '') ~ '^\d+$'
    then least((current_step->>'xp')::integer, 1000) else 50 end;
  awarded_xp := case when newly_completed then step_xp else 0 end;

  select jsonb_agg(
    case
      when ordinality = step_position then value || jsonb_build_object('state', 'done', 'subtitle', 'Выполнено')
      when newly_completed and ordinality = step_position + 1 and value->>'state' = 'locked'
        then value || jsonb_build_object('state', 'active', 'subtitle', 'Текущее задание')
      else value
    end order by ordinality
  ) into next_steps
  from jsonb_array_elements(plan_row.steps) with ordinality;

  update public.ai_quest_plans
  set steps = next_steps, updated_at = now()
  where id = target_plan and user_id = current_user;

  insert into public.quest_task_records
    (user_id, goal, step_id, notes, chat, status, completed_at, updated_at)
  values
    (current_user, plan_row.goal, target_step, coalesce(task_notes, ''), task_chat, 'done', now(), now())
  on conflict (user_id, goal, step_id) do update set
    notes = excluded.notes,
    chat = excluded.chat,
    status = 'done',
    completed_at = coalesce(public.quest_task_records.completed_at, excluded.completed_at),
    updated_at = excluded.updated_at;

  if newly_completed then
    update public.profiles set
      xp = xp + step_xp,
      completed_tasks = completed_tasks + 1,
      level = greatest(level, ((xp + step_xp) / 300) + 1)
    where user_id = current_user;

    update public.challenge_participants cp set score = score + case c.type
      when 'tasks' then 1 when 'goal' then 1 when 'streak' then 1 else step_xp end
    from public.challenges c
    where cp.challenge_id = c.id and c.status = 'active'
      and current_date between c.starts_at and c.ends_at
      and cp.user_id = current_user and cp.invitation_status = 'accepted';
  end if;

  return next;
end;
$$;

revoke all on function public.complete_quest_task(uuid, integer, text, jsonb) from public;
grant execute on function public.complete_quest_task(uuid, integer, text, jsonb) to authenticated;

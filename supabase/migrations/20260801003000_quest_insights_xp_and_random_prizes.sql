-- Кью хранит короткий главный вывод по каждому квесту.
alter table public.ai_quest_plans add column insight text;

-- Синхронизирует старый прогресс карт с XP профиля без повторного начисления.
create or replace function public.sync_quest_progress()
returns integer language plpgsql security definer set search_path = ''
as $$
declare calculated_xp integer; calculated_tasks integer; result_xp integer;
begin
  select coalesce(sum((step->>'xp')::integer), 0), count(*)
    into calculated_xp, calculated_tasks
  from public.ai_quest_plans plans
  cross join lateral jsonb_array_elements(plans.steps) step
  where plans.user_id = auth.uid() and step->>'state' = 'done';

  update public.profiles set
    xp = greatest(xp, calculated_xp),
    completed_tasks = greatest(completed_tasks, calculated_tasks),
    level = greatest(level, (greatest(xp, calculated_xp) / 300) + 1)
  where user_id = auth.uid()
  returning xp into result_xp;
  return result_xp;
end;
$$;
grant execute on function public.sync_quest_progress() to authenticated;

-- Победитель получает случайную награду, неизвестную до самого финиша.
create or replace function public.finish_challenge(target_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare winner uuid; prize text; roll float;
begin
  if not exists (select 1 from public.challenges c where c.id = target_id
    and c.ends_at <= current_date and (c.creator_id = auth.uid() or public.is_challenge_participant(c.id)))
  then raise exception 'Challenge is not ready'; end if;
  select user_id into winner from public.challenge_participants
    where challenge_id = target_id and invitation_status = 'accepted'
    order by score desc, joined_at asc nulls last limit 1;
  roll := random();
  if roll < .4 then
    prize := '⚡ Дополнительные 20 Momentum';
    update public.profiles set momentum = least(100, momentum + 20), momentum_updated_at = now()
      where user_id = winner;
  elsif roll < .7 then
    prize := '🎒 Рюкзак идей';
    insert into public.user_rewards(user_id,reward_id) values(winner,'backpack') on conflict do nothing;
  elsif roll < .9 then
    prize := '🧥 Костюм исследователя';
    insert into public.user_rewards(user_id,reward_id) values(winner,'explorer') on conflict do nothing;
  else
    prize := '🌿 Лесная рамка';
    insert into public.user_rewards(user_id,reward_id) values(winner,'forest-frame') on conflict do nothing;
  end if;
  update public.challenges set status='finished', winner_id=winner, prize_result=prize where id=target_id;
  return prize;
end;
$$;
grant execute on function public.finish_challenge(uuid) to authenticated;

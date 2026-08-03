create table public.quest_chest_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid not null references public.ai_quest_plans(id) on delete cascade,
  chapter_index smallint not null check (chapter_index between 0 and 20),
  reward_id text not null,
  reward_label text not null,
  opened_at timestamptz not null default now(),
  unique (user_id, plan_id, chapter_index)
);

alter table public.quest_chest_openings enable row level security;
create policy "users see own chest openings" on public.quest_chest_openings
  for select using (auth.uid() = user_id);

create or replace function public.grant_unique_reward(target_user uuid)
returns table(reward_id text, reward_label text)
language plpgsql security definer set search_path = ''
as $$
declare chosen record;
begin
  select catalog.id, catalog.label into chosen
  from (values
    ('backpack', '🎒 Рюкзак идей'), ('explorer', '🧥 Юный исследователь'),
    ('forest-frame', '🌿 Лесная рамка'), ('compass', '🧭 Компас цели'),
    ('scientist', '🥼 Костюм учёного'), ('laptop', '💻 Ноутбук создателя'),
    ('eagle-scarf', '🧣 Шарф Кью'), ('sunrise', '🌅 Тема «Рассвет»'),
    ('glasses', '👓 Очки фокуса'), ('camera', '📷 Камера открытий'),
    ('programmer', '🧑‍💻 Костюм программиста'), ('space-frame', '🪐 Космическая рамка'),
    ('telescope', '🔭 Телескоп мечты'), ('eagle-crown', '👑 Звёздная корона')
  ) as catalog(id, label)
  where not exists (select 1 from public.user_rewards owned
    where owned.user_id = target_user and owned.reward_id = catalog.id)
  order by random() limit 1;

  if chosen.id is null then
    return query select 'collection-complete'::text, '🏆 Все уникальные призы уже собраны'::text;
    return;
  end if;
  insert into public.user_rewards(user_id, reward_id) values(target_user, chosen.id);
  return query select chosen.id::text, chosen.label::text;
end;
$$;
revoke all on function public.grant_unique_reward(uuid) from public;

create or replace function public.open_quest_chest(target_plan uuid, target_chapter integer)
returns text language plpgsql security definer set search_path = ''
as $$
declare existing text; prize record; completed integer; total integer;
begin
  select opening.reward_label into existing from public.quest_chest_openings opening
    where opening.user_id = auth.uid() and opening.plan_id = target_plan
      and opening.chapter_index = target_chapter;
  if existing is not null then return existing; end if;

  select count(*), count(*) filter (where step.value->>'state' = 'done') into total, completed
  from public.ai_quest_plans plan
  cross join lateral jsonb_array_elements(plan.steps) with ordinality step(value, position)
  where plan.id = target_plan and plan.user_id = auth.uid()
    and step.position > target_chapter * 3 and step.position <= target_chapter * 3 + 3;
  if total <> 3 or completed <> 3 then raise exception 'Chest is locked'; end if;

  select * into prize from public.grant_unique_reward(auth.uid());
  insert into public.quest_chest_openings(user_id, plan_id, chapter_index, reward_id, reward_label)
    values(auth.uid(), target_plan, target_chapter, prize.reward_id, prize.reward_label);
  return prize.reward_label;
end;
$$;
grant execute on function public.open_quest_chest(uuid, integer) to authenticated;

create or replace function public.finish_challenge(target_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare winner uuid; prize record; existing text;
begin
  select c.prize_result into existing from public.challenges c where c.id = target_id and c.status = 'finished';
  if existing is not null then return existing; end if;
  if not exists (select 1 from public.challenges c where c.id = target_id
    and c.ends_at <= current_date and (c.creator_id = auth.uid() or public.is_challenge_participant(c.id)))
  then raise exception 'Challenge is not ready'; end if;
  select user_id into winner from public.challenge_participants
    where challenge_id = target_id and invitation_status = 'accepted'
    order by score desc, joined_at asc nulls last limit 1;
  if winner is null then raise exception 'Challenge has no accepted participants'; end if;
  select * into prize from public.grant_unique_reward(winner);
  update public.challenges set status = 'finished', winner_id = winner, prize_result = prize.reward_label
    where id = target_id;
  return prize.reward_label;
end;
$$;
grant execute on function public.finish_challenge(uuid) to authenticated;

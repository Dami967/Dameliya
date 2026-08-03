create table public.ai_generated_rewards (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  icon text not null check (char_length(icon) between 1 and 16),
  category text not null check (category in ('medals','accessories','frames','themes')),
  rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary','mythic')),
  description text not null check (char_length(description) between 2 and 240),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, title)
);
alter table public.ai_generated_rewards enable row level security;
create policy "users see own ai rewards" on public.ai_generated_rewards
  for select using (auth.uid() = user_id);

create or replace function public.save_ai_chest_reward(target_plan uuid, target_chapter integer,
  generated_id text, generated_title text, generated_icon text, generated_category text,
  generated_rarity text, generated_description text)
returns text language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.quest_chest_openings opening
    where opening.user_id = auth.uid() and opening.plan_id = target_plan
      and opening.chapter_index = target_chapter and opening.reward_id = 'collection-complete')
  then raise exception 'AI reward is not needed'; end if;
  insert into public.ai_generated_rewards(id,user_id,title,icon,category,rarity,description)
    values(generated_id,auth.uid(),generated_title,generated_icon,generated_category,generated_rarity,generated_description);
  insert into public.user_rewards(user_id,reward_id) values(auth.uid(),generated_id);
  update public.quest_chest_openings set reward_id = generated_id,
    reward_label = generated_icon || ' ' || generated_title
    where user_id = auth.uid() and plan_id = target_plan and chapter_index = target_chapter;
  return generated_icon || ' ' || generated_title;
end;
$$;
grant execute on function public.save_ai_chest_reward(uuid,integer,text,text,text,text,text,text) to authenticated;

create or replace function public.save_ai_challenge_reward(target_challenge uuid,
  generated_id text, generated_title text, generated_icon text, generated_category text,
  generated_rarity text, generated_description text)
returns text language plpgsql security definer set search_path = ''
as $$
declare winner uuid;
begin
  select c.winner_id into winner from public.challenges c where c.id = target_challenge
    and c.status = 'finished' and c.prize_result = '🏆 Все уникальные призы уже собраны'
    and (c.creator_id = auth.uid() or public.is_challenge_participant(c.id));
  if winner is null then raise exception 'AI reward is not needed'; end if;
  insert into public.ai_generated_rewards(id,user_id,title,icon,category,rarity,description)
    values(generated_id,winner,generated_title,generated_icon,generated_category,generated_rarity,generated_description);
  insert into public.user_rewards(user_id,reward_id) values(winner,generated_id);
  update public.challenges set prize_result = generated_icon || ' ' || generated_title where id = target_challenge;
  return generated_icon || ' ' || generated_title;
end;
$$;
grant execute on function public.save_ai_challenge_reward(uuid,text,text,text,text,text,text) to authenticated;

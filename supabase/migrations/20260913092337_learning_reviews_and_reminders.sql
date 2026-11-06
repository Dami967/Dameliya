create table public.quest_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.ai_quest_plans(id) on delete cascade,
  step_id integer not null check (step_id > 0),
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 5),
  best_score integer check (best_score between 0 and 5),
  attempts integer not null default 0,
  completed_at timestamptz,
  reward_id text,
  primary key (user_id, plan_id, step_id)
);
alter table public.quest_reviews enable row level security;
create policy "users see own reviews" on public.quest_reviews for select to authenticated using (auth.uid() = user_id);
create policy "users create own completed step review" on public.quest_reviews for insert to authenticated
  with check (auth.uid() = user_id and best_score is null and attempts = 0 and reward_id is null
    and exists (select 1 from public.ai_quest_plans p, jsonb_array_elements(p.steps) s
      where p.id = plan_id and p.user_id = auth.uid() and (s->>'id')::integer = step_id and s->>'state' = 'done'));
grant select, insert on public.quest_reviews to authenticated;
revoke update, delete on public.quest_reviews from authenticated;

create function public.finish_quest_review(target_plan uuid, target_step integer, selected_answers jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare q jsonb; score integer := 0; i integer;
begin
  select questions into q from public.quest_reviews where user_id = auth.uid()
    and plan_id = target_plan and step_id = target_step for update;
  if q is null or jsonb_typeof(selected_answers) <> 'array' or jsonb_array_length(selected_answers) <> 5
    then raise exception 'Invalid review'; end if;
  for i in 0..4 loop
    if (selected_answers->>i)::integer not between 0 and 3 then raise exception 'Invalid answer'; end if;
    if (selected_answers->>i)::integer = (q->i->>'correct')::integer then score := score + 1; end if;
  end loop;
  update public.quest_reviews set best_score = greatest(coalesce(best_score, 0), score),
    attempts = attempts + 1, completed_at = now()
    where user_id = auth.uid() and plan_id = target_plan and step_id = target_step;
  return score;
end $$;
revoke all on function public.finish_quest_review(uuid,integer,jsonb) from public;
grant execute on function public.finish_quest_review(uuid,integer,jsonb) to authenticated;

create function public.claim_review_reward(target_plan uuid, target_step integer,
  reward_title text, reward_icon text, reward_category text, reward_description text)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.quest_reviews; prize_id text;
begin
  select * into r from public.quest_reviews where user_id = auth.uid()
    and plan_id = target_plan and step_id = target_step for update;
  if r.user_id is null or coalesce(r.best_score, 0) < 3 or target_step % 3 <> 0 then raise exception 'Finish checkpoint first'; end if;
  if r.reward_id is not null then return 'Приз этой контрольной точки уже в коллекции.'; end if;
  prize_id := 'review-' || target_plan::text || '-' || target_step::text;
  insert into public.ai_generated_rewards(user_id,id,title,icon,category,rarity,description)
    values(auth.uid(),prize_id,left(reward_title,70) || ' · ' || target_step,reward_icon,reward_category,'rare',reward_description);
  insert into public.user_rewards(user_id,reward_id) values(auth.uid(),prize_id);
  update public.quest_reviews set reward_id = prize_id where user_id = auth.uid() and plan_id = target_plan and step_id = target_step;
  return reward_icon || ' ' || reward_title || ' — новый приз в коллекции!';
end $$;
revoke all on function public.claim_review_reward(uuid,integer,text,text,text,text) from public;
grant execute on function public.claim_review_reward(uuid,integer,text,text,text,text) to authenticated;

alter table public.user_settings add column streak_notifications boolean not null default true,
  add column achievement_notifications boolean not null default true;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('follow','message','competition','reminder','achievement'));
alter table public.notifications add column dedupe_key text;
create unique index notifications_dedupe_idx on public.notifications(user_id,dedupe_key) where dedupe_key is not null;
create policy "users create own reminder" on public.notifications for insert to authenticated
  with check (auth.uid() = user_id and actor_id is null and kind = 'reminder');

create function public.notify_task_achievement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done')
    and exists(select 1 from public.user_settings where user_id = new.user_id and achievement_notifications)
  then
    insert into public.notifications(user_id,kind,title,body,link,dedupe_key)
      values(new.user_id,'achievement','Ещё один шаг к цели!','Этап ' || new.step_id || ' завершён. Закрепи навык в игре на карте.',
        '/quest','task-' || new.id::text) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger task_achievement_notification after insert or update of status on public.quest_task_records
  for each row execute function public.notify_task_achievement();

alter table public.ai_quest_plans
  add column id uuid default gen_random_uuid() not null,
  add column created_at timestamptz not null default now();

alter table public.ai_quest_plans drop constraint ai_quest_plans_pkey;
alter table public.ai_quest_plans add primary key (id);
alter table public.ai_quest_plans add constraint ai_quest_plans_user_goal_key unique (user_id, goal);
create index ai_quest_plans_user_recent_idx on public.ai_quest_plans(user_id, updated_at desc);

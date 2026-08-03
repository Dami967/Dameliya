create table public.external_quest_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid not null references public.ai_quest_plans(id) on delete cascade,
  goal text not null,
  content text not null check (char_length(content) between 10 and 5000),
  ai_summary text not null default '',
  created_at timestamptz not null default now()
);
alter table public.external_quest_progress enable row level security;
create policy "users manage own external progress" on public.external_quest_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index external_progress_user_goal_idx
  on public.external_quest_progress(user_id, goal, created_at desc);

create table public.ai_quest_plans (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  goal text not null check (char_length(goal) between 2 and 300),
  map_title text not null,
  steps jsonb not null check (jsonb_typeof(steps) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.ai_quest_plans enable row level security;
create policy "users manage own ai quest" on public.ai_quest_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

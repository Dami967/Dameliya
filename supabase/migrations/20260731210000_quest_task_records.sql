create table public.quest_task_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal text not null,
  step_id integer not null check (step_id between 1 and 100),
  notes text not null default '',
  chat jsonb not null default '[]'::jsonb check (jsonb_typeof(chat) = 'array'),
  status text not null default 'active' check (status in ('active', 'done')),
  attempts integer not null default 1 check (attempts > 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, goal, step_id),
  check (char_length(notes) <= 20000)
);

alter table public.quest_task_records enable row level security;
create policy "users read own task records" on public.quest_task_records
  for select to authenticated using (auth.uid() = user_id);
create policy "users create own task records" on public.quest_task_records
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own task records" on public.quest_task_records
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own task records" on public.quest_task_records
  for delete to authenticated using (auth.uid() = user_id);

create index quest_task_records_user_idx on public.quest_task_records(user_id, updated_at desc);

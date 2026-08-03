create table public.quest_task_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid not null references public.ai_quest_plans(id) on delete cascade,
  step_id integer not null check (step_id between 1 and 100),
  name text not null check (char_length(name) between 1 and 200),
  mime_type text not null check (mime_type in (
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'
  )),
  storage_path text not null unique,
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

alter table public.quest_task_attachments enable row level security;
create policy "users read own task attachments" on public.quest_task_attachments
  for select to authenticated using (auth.uid() = user_id);
create policy "users create own task attachments" on public.quest_task_attachments
  for insert to authenticated with check (auth.uid() = user_id and exists (
    select 1 from public.ai_quest_plans where id = plan_id and user_id = auth.uid()
  ));
create policy "users delete own task attachments" on public.quest_task_attachments
  for delete to authenticated using (auth.uid() = user_id);
create index quest_task_attachments_step_idx
  on public.quest_task_attachments(user_id, plan_id, step_id, created_at);

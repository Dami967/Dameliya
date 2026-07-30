-- Личные заметки не связаны с заметками внутри индивидуальных или командных квестов.
create table public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(title) <= 200),
  check (char_length(content) <= 50000)
);

alter table public.personal_notes enable row level security;

create policy "users read own personal notes" on public.personal_notes
  for select to authenticated using (auth.uid() = user_id);
create policy "users create own personal notes" on public.personal_notes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own personal notes" on public.personal_notes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own personal notes" on public.personal_notes
  for delete to authenticated using (auth.uid() = user_id);

create index personal_notes_recent_idx on public.personal_notes(user_id, updated_at desc);

-- Обращения сохраняются, даже если Telegram временно недоступен.
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mode text not null check (mode in ('support', 'bug', 'rate')),
  subject text not null check (char_length(subject) between 2 and 120),
  details text not null check (char_length(details) between 2 and 4000),
  location text not null default '',
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.support_requests enable row level security;
create policy "users create own support requests" on public.support_requests for insert
  to authenticated with check (user_id = auth.uid());
create policy "users see own support requests" on public.support_requests for select
  to authenticated using (user_id = auth.uid());
create index support_requests_user_idx on public.support_requests(user_id, created_at desc);

create table public.user_rewards (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reward_id text not null,
  equipped boolean not null default false,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);

alter table public.user_rewards enable row level security;

create policy "users manage own rewards" on public.user_rewards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

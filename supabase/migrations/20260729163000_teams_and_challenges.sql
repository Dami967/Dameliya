-- Полные команды и дружеские челленджи.
alter table public.teams
  add column avatar_url text,
  add column visibility text not null default 'public'
    check (visibility in ('public', 'private'));

create table public.team_goals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  creator_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  progress smallint not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  type text not null check (type in ('xp', 'tasks', 'streak', 'goal', 'custom')),
  starts_at date not null,
  ends_at date not null,
  reward text not null,
  status text not null default 'invited' check (status in ('invited', 'active', 'finished')),
  winner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create table public.challenge_participants (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invitation_status text not null default 'pending'
    check (invitation_status in ('pending', 'accepted', 'declined')),
  score integer not null default 0 check (score >= 0),
  joined_at timestamptz,
  primary key (challenge_id, user_id)
);

alter table public.team_goals enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

create policy "members see team goals" on public.team_goals for select using (
  exists (select 1 from public.team_members
    where team_id = team_goals.team_id and user_id = auth.uid())
);
create policy "members create team goals" on public.team_goals for insert with check (
  auth.uid() = creator_id and exists (select 1 from public.team_members
    where team_id = team_goals.team_id and user_id = auth.uid())
);
create policy "goal creators update goals" on public.team_goals for update
  using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

create policy "participants see challenges" on public.challenges for select using (
  auth.uid() = creator_id or exists (select 1 from public.challenge_participants
    where challenge_id = challenges.id and user_id = auth.uid())
);
create policy "users create challenges" on public.challenges for insert
  with check (auth.uid() = creator_id);
create policy "creators manage challenges" on public.challenges for update
  using (auth.uid() = creator_id) with check (auth.uid() = creator_id);
create policy "creators delete challenges" on public.challenges for delete
  using (auth.uid() = creator_id);

create or replace function public.is_challenge_participant(target_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $$ select exists (
  select 1 from public.challenge_participants
  where challenge_id = target_id and user_id = auth.uid()
); $$;
grant execute on function public.is_challenge_participant(uuid) to authenticated;

create policy "participants see challenge ranking" on public.challenge_participants for select using (
  exists (select 1 from public.challenges where id = challenge_id and (
    creator_id = auth.uid() or public.is_challenge_participant(challenge_id)
  ))
);
create policy "creators invite participants" on public.challenge_participants for insert with check (
  exists (select 1 from public.challenges
    where id = challenge_id and creator_id = auth.uid())
);
create policy "users answer invitations" on public.challenge_participants for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('team-avatars', 'team-avatars', true)
on conflict (id) do nothing;
create policy "users upload team avatars" on storage.objects for insert
  with check (bucket_id = 'team-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update team avatars" on storage.objects for update
  using (bucket_id = 'team-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.activate_ready_challenge(target_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.challenge_participants
    where challenge_id = target_id and invitation_status = 'accepted'
  ) then
    update public.challenges set status = 'active'
    where id = target_id and status = 'invited';
  end if;
end;
$$;
grant execute on function public.activate_ready_challenge(uuid) to authenticated;

create index team_goals_team_idx on public.team_goals(team_id);
create index challenge_participants_user_idx on public.challenge_participants(user_id);

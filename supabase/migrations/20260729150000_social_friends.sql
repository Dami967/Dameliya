-- Социальный раздел GoalQuest: подписки, чаты, активность, команды и общие награды.
alter table public.profiles
  add column if not exists main_goal_public boolean not null default true,
  add column if not exists favorite_costume text not null default 'Костюм исследователя',
  add column if not exists eagle_name text not null default 'Орлёнок Искра',
  add column if not exists favorite_medal text not null default 'Первые шаги',
  add column if not exists collection_progress smallint not null default 0
    check (collection_progress between 0 and 100),
  add column if not exists last_seen_at timestamptz not null default now();

-- Представление не раскрывает приватные заметки профиля (сильные стороны и трудности).
create view public.social_profiles as
select user_id, display_name, username, avatar_url, age, interests,
  case when main_goal_public then main_goals[1] else null end as main_goal,
  xp, level, streak, favorite_costume, eagle_name, favorite_medal,
  collection_progress, last_seen_at
from public.profiles;
grant select on public.social_profiles to authenticated;

create table public.follows (
  follower_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'reaction', 'support', 'gift', 'challenge')),
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create table public.social_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('level', 'goal', 'reward', 'chest', 'streak', 'project')),
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.activity_reactions (
  activity_id uuid not null references public.social_activities(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '🔥', '👏', '💡')),
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create table public.activity_comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.social_activities(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  topic text not null,
  description text not null default '',
  progress smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.shared_awards (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  participant_ids uuid[] not null,
  title text not null,
  description text not null default '',
  icon text not null default '🏆',
  created_at timestamptz not null default now(),
  check (cardinality(participant_ids) >= 2)
);

alter table public.follows enable row level security;
alter table public.direct_messages enable row level security;
alter table public.social_activities enable row level security;
alter table public.activity_reactions enable row level security;
alter table public.activity_comments enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_messages enable row level security;
alter table public.shared_awards enable row level security;

create policy "users manage own follows" on public.follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy "users see followers" on public.follows
  for select using (auth.uid() = following_id);
create policy "friends exchange messages" on public.direct_messages
  for select using (auth.uid() in (sender_id, recipient_id));
create policy "users send own messages" on public.direct_messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from public.follows a join public.follows b
        on a.follower_id = b.following_id and a.following_id = b.follower_id
      where a.follower_id = auth.uid() and a.following_id = recipient_id
    )
  );
create policy "recipients mark messages read" on public.direct_messages
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

create policy "authenticated users see activity" on public.social_activities for select to authenticated using (true);
create policy "users manage own activity" on public.social_activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "authenticated users see reactions" on public.activity_reactions for select to authenticated using (true);
create policy "users manage own reactions" on public.activity_reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "authenticated users see comments" on public.activity_comments for select to authenticated using (true);
create policy "users manage own comments" on public.activity_comments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "authenticated users discover teams" on public.teams for select to authenticated using (true);
create policy "owners manage teams" on public.teams for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "authenticated users see team members" on public.team_members for select to authenticated using (true);
create policy "users join and leave teams" on public.team_members for insert with check (auth.uid() = user_id);
create policy "users leave teams" on public.team_members for delete using (auth.uid() = user_id);
create policy "members see team chat" on public.team_messages for select using (
  exists (select 1 from public.team_members where team_id = team_messages.team_id and user_id = auth.uid())
);
create policy "members send team messages" on public.team_messages for insert with check (
  auth.uid() = user_id and exists (
    select 1 from public.team_members where team_id = team_messages.team_id and user_id = auth.uid()
  )
);
create policy "participants see shared awards" on public.shared_awards for select
  using (auth.uid() = any(participant_ids));
create policy "users create shared awards" on public.shared_awards for insert
  with check (auth.uid() = creator_id and auth.uid() = any(participant_ids));

create index direct_messages_people_idx on public.direct_messages(sender_id, recipient_id, created_at);
create index social_activities_created_idx on public.social_activities(created_at desc);
create index team_members_user_idx on public.team_members(user_id);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  username text unique,
  bio text not null default '',
  avatar_url text,
  age smallint check (age between 6 and 120),
  country text not null default '',
  occupation text not null default '',
  interests text[] not null default '{}',
  main_goals text[] not null default '{}',
  strengths text not null default '',
  challenges text not null default '',
  daily_goal text not null default '',
  daily_minutes smallint not null default 30 check (daily_minutes between 5 and 720),
  completed_goals integer not null default 0 check (completed_goals >= 0),
  completed_tasks integer not null default 0 check (completed_tasks >= 0),
  learning_minutes integer not null default 0 check (learning_minutes >= 0),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  streak integer not null default 0 check (streak >= 0),
  momentum integer not null default 100 check (momentum between 0 and 100),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'ru',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  reminders boolean not null default true,
  push_notifications boolean not null default true,
  email_notifications boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.chat_history enable row level security;

create policy "users manage own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own chats" on public.chat_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "users upload own avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own avatar" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own avatar" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.create_user_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_user_profile();

insert into public.profiles (user_id, display_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (user_id) do nothing;

insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.delete_own_account()
returns void language sql security definer set search_path = ''
as $$ delete from auth.users where id = auth.uid(); $$;

grant execute on function public.delete_own_account() to authenticated;

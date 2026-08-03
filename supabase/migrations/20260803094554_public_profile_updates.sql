create table public.profile_public_updates (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.profile_public_updates enable row level security;
create policy "authenticated users see public profile updates"
  on public.profile_public_updates for select to authenticated using (true);

create or replace function public.announce_public_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(new.display_name, new.username, new.bio, new.avatar_url, new.interests,
    new.main_goals, new.level, new.xp, new.streak)
    is distinct from row(old.display_name, old.username, old.bio, old.avatar_url, old.interests,
    old.main_goals, old.level, old.xp, old.streak) then
    insert into public.profile_public_updates (user_id, updated_at) values (new.user_id, now())
    on conflict (user_id) do update set updated_at = excluded.updated_at;
  end if;
  return new;
end;
$$;
create trigger announce_profile_update after update on public.profiles
  for each row execute function public.announce_public_profile_update();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'profile_public_updates') then
    alter publication supabase_realtime add table public.profile_public_updates;
  end if;
end $$;

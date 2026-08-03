create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('follow', 'message')),
  title text not null,
  body text not null default '',
  link text not null default '/friends',
  source_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "users read own notifications" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "users update own notifications" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own notifications" on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.notify_about_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, kind, title, body, source_id)
  values (new.following_id, new.follower_id, 'follow', 'Новый подписчик',
    'На тебя подписался новый пользователь.', gen_random_uuid());
  return new;
end;
$$;

create or replace function public.notify_about_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, kind, title, body, source_id)
  values (new.recipient_id, new.sender_id, 'message', 'Новое сообщение',
    case when new.kind = 'text' then left(new.content, 120) else 'Тебе отправили новое сообщение.' end,
    new.id);
  return new;
end;
$$;

create trigger follows_create_notification after insert on public.follows
  for each row execute function public.notify_about_follow();
create trigger messages_create_notification after insert on public.direct_messages
  for each row execute function public.notify_about_message();

create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications(user_id, read_at) where read_at is null;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('follow', 'message', 'competition'));

create or replace function public.notify_about_competition()
returns trigger language plpgsql security definer set search_path = '' as $$
declare challenge_title text;
begin
  if new.invitation_status <> 'pending' then return new; end if;
  select title into challenge_title from public.challenges where id = new.challenge_id;
  insert into public.notifications (user_id, actor_id, kind, title, body, link, source_id)
  select new.user_id, creator_id, 'competition', 'Приглашение в соревнование',
    'Тебя пригласили в «' || challenge_title || '».', '/rewards?section=competitions', new.challenge_id
  from public.challenges where id = new.challenge_id;
  return new;
end;
$$;
create trigger challenge_create_notification after insert on public.challenge_participants
  for each row execute function public.notify_about_competition();

create table public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer', 'answer', 'ice', 'hangup', 'reject')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
alter table public.call_signals enable row level security;
create policy "call participants read signals" on public.call_signals for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));
create policy "mutual friends send call signals" on public.call_signals for insert to authenticated
  with check (auth.uid() = sender_id and exists (
    select 1 from public.follows a join public.follows b
      on a.follower_id = b.following_id and a.following_id = b.follower_id
    where a.follower_id = auth.uid() and a.following_id = recipient_id
  ));
create policy "participants delete call signals" on public.call_signals for delete to authenticated
  using (auth.uid() in (sender_id, recipient_id));
create index call_signals_recipient_idx on public.call_signals(recipient_id, created_at desc);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'call_signals') then
    alter publication supabase_realtime add table public.call_signals;
  end if;
end $$;

create or replace function public.add_challenge_score(points integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.challenge_participants cp set score = score + case c.type
    when 'tasks' then 1
    when 'goal' then 1
    when 'streak' then 1
    else greatest(0, points)
  end
  from public.challenges c where cp.challenge_id = c.id and c.status = 'active'
    and current_date between c.starts_at and c.ends_at and cp.user_id = auth.uid()
    and cp.invitation_status = 'accepted';
end;
$$;

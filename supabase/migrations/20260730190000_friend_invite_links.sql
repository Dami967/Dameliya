create table public.friend_invites (
  token uuid primary key default gen_random_uuid(),
  inviter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  check (accepted_by is null or accepted_by <> inviter_id)
);

alter table public.friend_invites enable row level security;

create policy "users create own friend invites" on public.friend_invites
  for insert to authenticated with check (auth.uid() = inviter_id);

create policy "users see own friend invites" on public.friend_invites
  for select to authenticated using (auth.uid() = inviter_id);

create or replace function public.accept_friend_invite(invite_token uuid)
returns table(inviter_id uuid, inviter_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.friend_invites;
begin
  if auth.uid() is null then raise exception 'Sign in to accept this invitation'; end if;

  select * into invite from public.friend_invites
  where token = invite_token for update;

  if invite.token is null then raise exception 'Invitation not found'; end if;
  if invite.expires_at <= now() then raise exception 'Invitation has expired'; end if;
  if invite.accepted_at is not null then raise exception 'Invitation has already been used'; end if;
  if invite.inviter_id = auth.uid() then raise exception 'You cannot add yourself'; end if;

  insert into public.follows(follower_id, following_id)
  values (invite.inviter_id, auth.uid()), (auth.uid(), invite.inviter_id)
  on conflict (follower_id, following_id) do nothing;

  update public.friend_invites set accepted_by = auth.uid(), accepted_at = now()
  where token = invite_token;

  return query select invite.inviter_id, coalesce(profile.display_name, 'Пользователь GoalQuest')
  from public.profiles profile where profile.user_id = invite.inviter_id;
end;
$$;

revoke all on function public.accept_friend_invite(uuid) from public;
grant execute on function public.accept_friend_invite(uuid) to authenticated;

create index friend_invites_inviter_idx on public.friend_invites(inviter_id, created_at desc);

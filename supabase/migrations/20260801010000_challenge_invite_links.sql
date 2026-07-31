-- Персональная ссылка на челлендж: QR и ссылка для приглашения до пяти друзей.
create table public.challenge_invite_links (
  token uuid primary key default gen_random_uuid(),
  challenge_id uuid not null unique references public.challenges(id) on delete cascade,
  creator_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.challenge_invite_links enable row level security;
create policy "creators see challenge links" on public.challenge_invite_links for select
  using (creator_id = auth.uid());

create or replace function public.create_challenge_invite(target_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare result_token uuid;
begin
  if not exists (select 1 from public.challenges where id = target_id and creator_id = auth.uid()) then
    raise exception 'Only the challenge creator can share it';
  end if;
  insert into public.challenge_invite_links (challenge_id, creator_id)
  values (target_id, auth.uid())
  on conflict (challenge_id) do update set expires_at = now() + interval '7 days'
  returning token into result_token;
  return result_token;
end;
$$;

create or replace function public.get_challenge_invite(invite_token uuid)
returns table (
  challenge_id uuid, title text, challenge_type text, starts_at date, ends_at date,
  inviter_name text, participant_count bigint
) language sql security definer stable set search_path = ''
as $$
  select c.id, c.title, c.type, c.starts_at, c.ends_at,
    coalesce(p.display_name, 'Друг GoalQuest'),
    (select count(*) from public.challenge_participants cp
      where cp.challenge_id = c.id and cp.invitation_status <> 'declined')
  from public.challenge_invite_links link
  join public.challenges c on c.id = link.challenge_id
  left join public.profiles p on p.user_id = c.creator_id
  where link.token = invite_token and link.expires_at > now() and c.status <> 'finished';
$$;

create or replace function public.accept_challenge_invite(invite_token uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare invite public.challenge_invite_links; challenge_creator uuid; participant_total integer;
begin
  select * into invite from public.challenge_invite_links
    where token = invite_token and expires_at > now();
  if invite.token is null then raise exception 'Invite expired'; end if;
  select creator_id into challenge_creator from public.challenges
    where id = invite.challenge_id and status <> 'finished';
  if challenge_creator is null then raise exception 'Challenge unavailable'; end if;
  if challenge_creator = auth.uid() then raise exception 'Cannot invite yourself'; end if;
  select count(*) into participant_total from public.challenge_participants
    where challenge_id = invite.challenge_id and invitation_status <> 'declined';
  if participant_total >= 6 then raise exception 'Challenge is full'; end if;
  insert into public.challenge_participants (challenge_id, user_id, invitation_status, joined_at)
  values (invite.challenge_id, auth.uid(), 'accepted', now())
  on conflict (challenge_id, user_id) do update
    set invitation_status = 'accepted', joined_at = now();
  update public.challenges set status = 'active'
    where id = invite.challenge_id and status = 'invited';
  return invite.challenge_id;
end;
$$;

grant execute on function public.create_challenge_invite(uuid) to authenticated;
grant execute on function public.get_challenge_invite(uuid) to anon, authenticated;
grant execute on function public.accept_challenge_invite(uuid) to authenticated;

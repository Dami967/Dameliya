-- Создаёт челлендж и все приглашения одним запросом.
create or replace function public.create_competition(
  challenge_title text,
  challenge_type text,
  start_date date,
  end_date date,
  participant_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  challenge_id uuid;
  friend_id uuid;
begin
  if actor_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(challenge_title)) not between 2 and 80 then raise exception 'Invalid title'; end if;
  if challenge_type not in ('xp', 'tasks', 'streak', 'goal', 'custom') then raise exception 'Invalid type'; end if;
  if end_date < start_date then raise exception 'Invalid dates'; end if;
  if cardinality(coalesce(participant_ids, array[]::uuid[])) > 5 then raise exception 'Too many participants'; end if;

  foreach friend_id in array coalesce(participant_ids, array[]::uuid[]) loop
    if friend_id = actor_user_id or not (
      exists (select 1 from public.follows where follower_id = actor_user_id and following_id = friend_id)
      and exists (select 1 from public.follows where follower_id = friend_id and following_id = actor_user_id)
    ) then raise exception 'Participant is not a mutual friend'; end if;
  end loop;

  insert into public.challenges (creator_id, title, type, starts_at, ends_at, reward)
  values (actor_user_id, trim(challenge_title), challenge_type, start_date, end_date, 'Случайный приз')
  returning id into challenge_id;

  insert into public.challenge_participants
    (challenge_id, user_id, invitation_status, joined_at)
  values (challenge_id, actor_user_id, 'accepted', now());

  insert into public.challenge_participants (challenge_id, user_id, invitation_status)
  select challenge_id, invited_id, 'pending'
  from unnest(coalesce(participant_ids, array[]::uuid[])) invited_id
  where invited_id <> actor_user_id
  on conflict (challenge_id, user_id) do nothing;

  return challenge_id;
end;
$$;

revoke all on function public.create_competition(text,text,date,date,uuid[]) from public;
grant execute on function public.create_competition(text,text,date,date,uuid[]) to authenticated;

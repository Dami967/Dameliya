-- Убирает неоднозначность имён переменных и колонок PostgreSQL.
create or replace function public.create_competition(
  challenge_title text, challenge_type text, start_date date, end_date date, participant_ids uuid[]
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  new_challenge_id uuid;
  invited_user_id uuid;
begin
  if actor_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(challenge_title)) not between 2 and 80 then raise exception 'Invalid title'; end if;
  if challenge_type not in ('xp', 'tasks', 'streak', 'goal', 'custom') then raise exception 'Invalid type'; end if;
  if end_date < start_date then raise exception 'Invalid dates'; end if;
  if cardinality(coalesce(participant_ids, array[]::uuid[])) > 5 then raise exception 'Too many participants'; end if;

  foreach invited_user_id in array coalesce(participant_ids, array[]::uuid[]) loop
    if invited_user_id = actor_user_id or not (
      exists (select 1 from public.follows f where f.follower_id = actor_user_id and f.following_id = invited_user_id)
      and exists (select 1 from public.follows f where f.follower_id = invited_user_id and f.following_id = actor_user_id)
    ) then raise exception 'Participant is not a mutual friend'; end if;
  end loop;

  insert into public.challenges (creator_id, title, type, starts_at, ends_at, reward)
  values (actor_user_id, trim(challenge_title), challenge_type, start_date, end_date, 'Случайный приз')
  returning id into new_challenge_id;

  insert into public.challenge_participants
    (challenge_id, user_id, invitation_status, joined_at)
  values (new_challenge_id, actor_user_id, 'accepted', now());

  insert into public.challenge_participants (challenge_id, user_id, invitation_status)
  select new_challenge_id, invited_id, 'pending'
  from unnest(coalesce(participant_ids, array[]::uuid[])) as invited(invited_id)
  where invited_id <> actor_user_id
  on conflict (challenge_id, user_id) do nothing;

  return new_challenge_id;
end;
$$;

revoke all on function public.create_competition(text,text,date,date,uuid[]) from public;
grant execute on function public.create_competition(text,text,date,date,uuid[]) to authenticated;

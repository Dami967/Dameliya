-- В одном челлендже: создатель и не больше пяти приглашённых друзей.
create or replace function public.limit_challenge_participants()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (select count(*) from public.challenge_participants where challenge_id = new.challenge_id) >= 6
  then raise exception 'A challenge can include at most five invited friends'; end if;
  return new;
end;
$$;

create trigger enforce_challenge_participant_limit
before insert on public.challenge_participants
for each row execute function public.limit_challenge_participants();

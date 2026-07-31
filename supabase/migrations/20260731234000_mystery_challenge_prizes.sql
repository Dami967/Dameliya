alter table public.challenges add column prize_result text;

create or replace function public.add_challenge_score(points integer)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.challenge_participants cp set score = score + greatest(0, points)
  from public.challenges c where cp.challenge_id = c.id and c.status = 'active'
    and c.starts_at <= current_date and c.ends_at >= current_date
    and cp.user_id = auth.uid() and cp.invitation_status = 'accepted';
end;
$$;
grant execute on function public.add_challenge_score(integer) to authenticated;

create or replace function public.finish_challenge(target_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare winner uuid; prize text; roll float;
begin
  if not exists (select 1 from public.challenges c where c.id = target_id
    and c.ends_at <= current_date and (c.creator_id = auth.uid() or public.is_challenge_participant(c.id)))
  then raise exception 'Challenge is not ready'; end if;
  select user_id into winner from public.challenge_participants
    where challenge_id = target_id and invitation_status = 'accepted'
    order by score desc, joined_at asc nulls last limit 1;
  roll := random();
  if roll < .4 then
    prize := '⚡ Дополнительные 20 Momentum';
    update public.profiles set momentum = least(100, momentum + 20), momentum_updated_at = now()
      where user_id = winner;
  elsif roll < .7 then
    prize := '🎒 Рюкзак идей';
    insert into public.user_rewards(user_id,reward_id) values(winner,'backpack') on conflict do nothing;
  elsif roll < .9 then
    prize := '🧥 Костюм исследователя';
    insert into public.user_rewards(user_id,reward_id) values(winner,'explorer') on conflict do nothing;
  else
    prize := '🌿 Лесная рамка';
    insert into public.user_rewards(user_id,reward_id) values(winner,'forest-frame') on conflict do nothing;
  end if;
  update public.challenges set status='finished', winner_id=winner, prize_result=prize where id=target_id;
  return prize;
end;
$$;
grant execute on function public.finish_challenge(uuid) to authenticated;

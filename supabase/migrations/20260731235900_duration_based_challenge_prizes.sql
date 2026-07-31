-- Награда соревнования выбирается автоматически: длительный вызов даёт более ценный приз.
create or replace function public.finish_challenge(target_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  winner uuid;
  prize text;
  challenge_days integer;
begin
  if not exists (select 1 from public.challenges c where c.id = target_id
    and c.ends_at <= current_date and (c.creator_id = auth.uid() or public.is_challenge_participant(c.id)))
  then raise exception 'Challenge is not ready'; end if;

  select user_id into winner from public.challenge_participants
    where challenge_id = target_id and invitation_status = 'accepted'
    order by score desc, joined_at asc nulls last limit 1;
  select greatest(1, ends_at - starts_at) into challenge_days
    from public.challenges where id = target_id;

  if challenge_days >= 30 then
    prize := '🪐 Космическая рамка';
    insert into public.user_rewards(user_id,reward_id) values(winner,'space-frame') on conflict do nothing;
  elsif challenge_days >= 14 then
    prize := '🧥 Костюм исследователя';
    insert into public.user_rewards(user_id,reward_id) values(winner,'explorer') on conflict do nothing;
  elsif challenge_days >= 7 then
    prize := '🎒 Рюкзак идей';
    insert into public.user_rewards(user_id,reward_id) values(winner,'backpack') on conflict do nothing;
  else
    prize := '⚡ Дополнительные 20 Momentum';
    update public.profiles set momentum = least(100, momentum + 20), momentum_updated_at = now()
      where user_id = winner;
  end if;

  update public.challenges set status='finished', winner_id=winner, prize_result=prize where id=target_id;
  return prize;
end;
$$;
grant execute on function public.finish_challenge(uuid) to authenticated;

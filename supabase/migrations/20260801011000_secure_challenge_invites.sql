-- Публично можно только посмотреть безопасные детали приглашения.
revoke all on function public.create_challenge_invite(uuid) from public;
revoke all on function public.get_challenge_invite(uuid) from public;
revoke all on function public.accept_challenge_invite(uuid) from public;

grant execute on function public.create_challenge_invite(uuid) to authenticated;
grant execute on function public.get_challenge_invite(uuid) to anon, authenticated;
grant execute on function public.accept_challenge_invite(uuid) to authenticated;

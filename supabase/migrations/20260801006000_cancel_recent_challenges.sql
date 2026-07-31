-- Создатель может отменить челлендж только в первые 24 часа.
create or replace function public.cancel_recent_challenge(target_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.challenges
    where id = target_id and creator_id = auth.uid()
      and created_at >= now() - interval '24 hours'
      and status <> 'finished'
  ) then raise exception 'Challenge can no longer be cancelled'; end if;
  delete from public.challenges where id = target_id and creator_id = auth.uid();
end;
$$;
grant execute on function public.cancel_recent_challenge(uuid) to authenticated;

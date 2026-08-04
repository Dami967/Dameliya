alter table public.direct_messages
  add column if not exists call_id uuid;

create unique index if not exists direct_messages_call_id_idx
  on public.direct_messages(call_id) where call_id is not null;

create or replace function public.record_call_history(
  target_user_id uuid,
  target_call_id uuid,
  target_content text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() = target_user_id then
    return false;
  end if;
  if not exists (
    select 1 from public.follows a
    join public.follows b
      on a.follower_id = b.following_id and a.following_id = b.follower_id
    where a.follower_id = auth.uid() and a.following_id = target_user_id
  ) then
    return false;
  end if;
  insert into public.direct_messages (sender_id, recipient_id, kind, content, call_id)
  values (auth.uid(), target_user_id, 'call', left(target_content, 1000), target_call_id)
  on conflict (call_id) where call_id is not null do nothing;
  return true;
end;
$$;

grant execute on function public.record_call_history(uuid, uuid, text) to authenticated;

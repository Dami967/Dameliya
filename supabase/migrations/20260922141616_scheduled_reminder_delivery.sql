-- Keep delivery receipts separately from the user's clearable inbox.
create table public.reminder_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  delivery_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, delivery_date)
);
alter table public.reminder_deliveries enable row level security;
create policy "Read own reminder receipts" on public.reminder_deliveries
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.reminder_deliveries from anon, authenticated;
grant select on public.reminder_deliveries to authenticated;

create or replace function public.deliver_scheduled_reminder(
  p_date date, p_title text, p_body text, p_link text
) returns uuid language plpgsql security definer set search_path = public as $$
declare notification_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.user_settings where user_id = auth.uid() and reminders) then
    return null;
  end if;
  insert into public.reminder_deliveries(user_id, delivery_date) values (auth.uid(), p_date)
    on conflict do nothing;
  if not found then return null; end if;
  insert into public.notifications(user_id, kind, title, body, link, dedupe_key)
    values (auth.uid(), 'reminder', left(p_title, 200), left(p_body, 1000), p_link, 'scheduled-' || p_date)
    returning id into notification_id;
  return notification_id;
end;
$$;
revoke all on function public.deliver_scheduled_reminder(date,text,text,text) from public, anon;
grant execute on function public.deliver_scheduled_reminder(date,text,text,text) to authenticated;

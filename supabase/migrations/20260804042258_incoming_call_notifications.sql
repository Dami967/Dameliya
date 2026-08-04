create or replace function public.notify_about_incoming_call()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.signal_type = 'offer' then
    insert into public.notifications (user_id, actor_id, kind, title, body, link, source_id)
    values (new.recipient_id, new.sender_id, 'message', 'Входящий звонок',
      'Тебе звонят в GoalQuest. Открой приложение, чтобы ответить.', '/friends', new.call_id);
  end if;
  return new;
end;
$$;
create trigger call_create_notification after insert on public.call_signals
  for each row execute function public.notify_about_incoming_call();

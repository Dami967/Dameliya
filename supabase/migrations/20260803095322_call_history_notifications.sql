create or replace function public.notify_about_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, kind, title, body, source_id)
  values (new.recipient_id, new.sender_id, 'message',
    case when new.kind = 'call' then 'Событие звонка' else 'Новое сообщение' end,
    case when new.kind in ('text', 'call') then left(new.content, 120)
      else 'Тебе отправили новое сообщение.' end,
    new.id);
  return new;
end;
$$;

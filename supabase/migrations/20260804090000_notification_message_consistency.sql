delete from public.notifications older
using public.notifications newer
where older.user_id = newer.user_id
  and older.source_id = newer.source_id
  and older.source_id is not null
  and (older.created_at < newer.created_at
    or (older.created_at = newer.created_at and older.id < newer.id));

create unique index if not exists notifications_user_source_idx
  on public.notifications(user_id, source_id) where source_id is not null;

create or replace function public.notify_about_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, kind, title, body, link, source_id)
  values (new.recipient_id, new.sender_id, 'message',
    case when new.kind = 'call' then 'Событие звонка' else 'Новое сообщение' end,
    case when new.kind in ('text', 'call') then left(new.content, 120)
      else 'Тебе отправили новое сообщение.' end,
    '/friends?chat=' || new.sender_id::text, new.id)
  on conflict (user_id, source_id) where source_id is not null do nothing;
  return new;
end;
$$;

create or replace function public.remove_notification_with_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications where source_id = old.id;
  return old;
end;
$$;

drop trigger if exists message_remove_notification on public.direct_messages;
create trigger message_remove_notification after delete on public.direct_messages
  for each row execute function public.remove_notification_with_message();

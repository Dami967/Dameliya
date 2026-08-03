alter table public.direct_messages
  drop constraint direct_messages_kind_check;

alter table public.direct_messages
  add constraint direct_messages_kind_check
  check (kind in ('text', 'reaction', 'support', 'gift', 'challenge', 'audio'));

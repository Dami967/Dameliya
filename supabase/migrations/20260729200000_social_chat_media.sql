-- Состояние интерактивных демо-карточек хранится в Supabase и переживает перезагрузку.
create table public.social_ui_state (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scope text not null check (scope in ('activity', 'chat')),
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, scope, entity_id)
);

alter table public.social_ui_state enable row level security;
create policy "users manage own social state" on public.social_ui_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.direct_messages drop constraint direct_messages_kind_check;
alter table public.direct_messages add constraint direct_messages_kind_check
  check (kind in ('text', 'reaction', 'support', 'gift', 'challenge', 'audio', 'call'));

insert into storage.buckets (id, name, public)
values ('voice-messages', 'voice-messages', true)
on conflict (id) do nothing;

create policy "users upload own voice messages" on storage.objects for insert
  with check (bucket_id = 'voice-messages'
    and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own voice messages" on storage.objects for delete
  using (bucket_id = 'voice-messages'
    and (storage.foldername(name))[1] = auth.uid()::text);

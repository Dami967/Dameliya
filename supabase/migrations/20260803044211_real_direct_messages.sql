-- Настоящие сообщения между взаимными друзьями обновляются в реальном времени.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;

alter table public.direct_messages replica identity full;

create policy "senders delete own messages" on public.direct_messages
  for delete to authenticated using (auth.uid() = sender_id);

create table public.note_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  note_id uuid not null references public.personal_notes(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  mime_type text not null,
  storage_path text not null unique,
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);
alter table public.note_attachments enable row level security;
create policy "users read own note attachments" on public.note_attachments
  for select to authenticated using (auth.uid() = user_id);
create policy "users create own note attachments" on public.note_attachments
  for insert to authenticated with check (auth.uid() = user_id and exists (
    select 1 from public.personal_notes where id = note_id and user_id = auth.uid()
  ));
create policy "users delete own note attachments" on public.note_attachments
  for delete to authenticated using (auth.uid() = user_id);
create index note_attachments_note_idx on public.note_attachments(note_id, created_at);

insert into storage.buckets (id, name, public, file_size_limit)
values ('note-attachments', 'note-attachments', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;
create policy "users read own note files" on storage.objects for select
  using (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users upload own note files" on storage.objects for insert
  with check (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own note files" on storage.objects for delete
  using (bucket_id = 'note-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

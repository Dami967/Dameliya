insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ai-attachments',
  'ai-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4',
    'application/pdf', 'text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users read own ai attachments" on storage.objects for select
  using (bucket_id = 'ai-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users upload own ai attachments" on storage.objects for insert
  with check (bucket_id = 'ai-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own ai attachments" on storage.objects for delete
  using (bucket_id = 'ai-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text);

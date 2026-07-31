import { supabase } from './supabase';

export type NoteAttachment = {
  id: string; note_id: string; name: string; mime_type: string;
  storage_path: string; size_bytes: number; created_at: string; url?: string;
};

export async function loadNoteAttachments(noteId: string) {
  const result = await supabase.from('note_attachments').select('*').eq('note_id', noteId)
    .order('created_at').returns<NoteAttachment[]>();
  if (!result.data) return result;
  const data = await Promise.all(result.data.map(async (item) => {
    const signed = await supabase.storage.from('note-attachments').createSignedUrl(item.storage_path, 3600);
    return { ...item, url: signed.data?.signedUrl };
  }));
  return { ...result, data };
}

export async function uploadNoteAttachment(userId: string, noteId: string, file: File) {
  if (!file.size || file.size > 10 * 1024 * 1024) return { error: new Error('Файл должен быть меньше 10 МБ.') };
  const name = file.name.slice(0, 200);
  const safe = name.replace(/[^\w.-]+/g, '-').slice(-80) || 'file';
  const path = `${userId}/${noteId}/${crypto.randomUUID()}-${safe}`;
  const uploaded = await supabase.storage.from('note-attachments').upload(path, file, { contentType: file.type });
  if (uploaded.error) return { error: uploaded.error };
  const saved = await supabase.from('note_attachments').insert({
    user_id: userId, note_id: noteId, name, mime_type: file.type || 'application/octet-stream',
    storage_path: path, size_bytes: file.size,
  }).select('*').single<NoteAttachment>();
  if (saved.error) await supabase.storage.from('note-attachments').remove([path]);
  if (saved.error || !saved.data) return saved;
  const signed = await supabase.storage.from('note-attachments').createSignedUrl(path, 3600);
  return { ...saved, data: { ...saved.data, url: signed.data?.signedUrl } };
}

export async function deleteNoteAttachment(item: NoteAttachment) {
  const removed = await supabase.storage.from('note-attachments').remove([item.storage_path]);
  if (removed.error) return removed;
  return supabase.from('note_attachments').delete().eq('id', item.id);
}

export async function deleteAllNoteAttachments(noteId: string) {
  const { data } = await supabase.from('note_attachments').select('storage_path').eq('note_id', noteId);
  if (data?.length) await supabase.storage.from('note-attachments').remove(data.map((item) => item.storage_path));
}

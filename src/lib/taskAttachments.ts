import { supabase } from './supabase';
import type { AiAttachment } from './aiAttachments';

export type TaskAttachment = {
  id: string; user_id: string; plan_id: string; step_id: number; name: string;
  mime_type: string; storage_path: string; size_bytes: number; created_at: string; url?: string;
};

const accepted = /^(image\/(jpeg|png|webp|gif)|application\/pdf|text\/plain)$/;

export async function loadTaskAttachments(planId: string, stepId: number) {
  const result = await supabase.from('quest_task_attachments').select('*').eq('plan_id', planId)
    .eq('step_id', stepId).order('created_at').returns<TaskAttachment[]>();
  if (!result.data) return result;
  const data = await Promise.all(result.data.map(async (item) => {
    const signed = await supabase.storage.from('ai-attachments').createSignedUrl(item.storage_path, 3600);
    return { ...item, url: signed.data?.signedUrl };
  }));
  return { ...result, data };
}

export async function uploadTaskAttachment(userId: string, planId: string, stepId: number, file: File) {
  if (!file.size || file.size > 10 * 1024 * 1024) return { data: null, error: new Error('Файл должен быть меньше 10 МБ.') };
  if (!accepted.test(file.type)) return { data: null, error: new Error('Можно добавить фото, PDF или TXT.') };
  const safe = file.name.replace(/[^\w.-]+/g, '-').slice(-80) || 'file';
  const path = `${userId}/tasks/${planId}/${stepId}/${crypto.randomUUID()}-${safe}`;
  const uploaded = await supabase.storage.from('ai-attachments').upload(path, file, { contentType: file.type });
  if (uploaded.error) return { data: null, error: uploaded.error };
  const saved = await supabase.from('quest_task_attachments').insert({ user_id: userId, plan_id: planId,
    step_id: stepId, name: file.name.slice(0, 200), mime_type: file.type,
    storage_path: path, size_bytes: file.size }).select('*').single<TaskAttachment>();
  if (saved.error) await supabase.storage.from('ai-attachments').remove([path]);
  return saved;
}

export async function deleteTaskAttachment(item: TaskAttachment) {
  const removed = await supabase.storage.from('ai-attachments').remove([item.storage_path]);
  return removed.error ? removed : supabase.from('quest_task_attachments').delete().eq('id', item.id);
}

export async function attachmentsForAi(items: TaskAttachment[]): Promise<AiAttachment[]> {
  const prepared: AiAttachment[] = [];
  for (const item of items.slice(0, 3)) {
    const { data } = await supabase.storage.from('ai-attachments').download(item.storage_path);
    if (!data) continue;
    prepared.push({ name: item.name, mimeType: item.mime_type, data: await blobToBase64(data) });
  }
  return prepared;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать вложение.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(blob);
  });
}

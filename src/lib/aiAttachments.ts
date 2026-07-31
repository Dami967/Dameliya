import { supabase } from './supabase';

export type AiAttachment = {
  name: string;
  mimeType: string;
  data: string;
};

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = /^(image\/(jpeg|png|webp|gif)|audio\/(webm|wav|mpeg|mp4)|application\/pdf|text\/plain)$/;

export async function prepareAiAttachment(userId: string, file: File): Promise<AiAttachment> {
  if (file.size > MAX_BYTES) throw new Error('Файл должен быть меньше 10 МБ.');
  if (!ACCEPTED.test(file.type)) throw new Error('Можно прикрепить фото, аудио, PDF или TXT.');

  const safeName = file.name.replace(/[^\w.-]+/g, '-').slice(-80) || 'attachment';
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('ai-attachments').upload(path, file, {
    contentType: file.type,
  });
  if (error) throw new Error('Не удалось загрузить вложение. Попробуй ещё раз.');

  return { name: file.name, mimeType: file.type, data: await toBase64(file) };
}

function toBase64(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  });
}

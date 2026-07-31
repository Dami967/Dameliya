import { supabase } from './supabase';
import type { AiAttachment } from './aiAttachments';

type AiResponse = { text?: unknown; error?: unknown };

export async function askAi(prompt: string, system: string, attachments: AiAttachment[] = []) {
  const { data, error } = await supabase.functions.invoke<AiResponse>('ai', {
    body: { prompt: prompt.trim(), system: system.trim(), attachments },
  });
  if (error) return { text: null, error: new Error(readFunctionError(error.message)) };
  if (typeof data?.error === 'string') return { text: null, error: new Error(data.error) };
  if (typeof data?.text !== 'string' || !data.text.trim()) {
    return { text: null, error: new Error('Кью не смог подготовить ответ. Попробуй ещё раз.') };
  }
  return { text: data.text.trim(), error: null };
}

export function parseAiJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}

export async function validateYoutubeVideo(url: string) {
  const videoId = youtubeId(url);
  if (!videoId) return false;
  const { data, error } = await supabase.functions.invoke<{ valid?: unknown }>('ai', {
    body: { action: 'validate_youtube', videoId },
  });
  return !error && data?.valid === true;
}

function youtubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2];
    return url.searchParams.get('v');
  } catch { return null; }
}

function readFunctionError(message: string) {
  if (message.includes('non-2xx')) return 'AI сейчас недоступен. Попробуй ещё раз немного позже.';
  return message || 'Не получилось обратиться к AI.';
}

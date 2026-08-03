import { supabase } from './supabase';
import type { AiAttachment } from './aiAttachments';

type AiResponse = { text?: unknown; error?: unknown };
export type YoutubeVideoResult = { type: 'video'; title: string; url: string; description: string };

export async function askAi(prompt: string, system: string, attachments: AiAttachment[] = [], useMomentum = false,
  jsonResponse = false) {
  if (useMomentum) {
    const energy = await supabase.rpc('use_ai_momentum');
    if (energy.error) return { text: null, error: new Error('Не удалось проверить Momentum.') };
    if (typeof energy.data !== 'number' || energy.data < 0) return { text: null, error: new Error('Momentum закончился. Пройди викторину, напиши отчёт или немного подожди.') };
    window.dispatchEvent(new CustomEvent('momentum-changed', { detail: energy.data }));
  }
  const { data, error } = await supabase.functions.invoke<AiResponse>('ai', {
    body: { prompt: prompt.trim(), system: system.trim(), attachments, json: jsonResponse },
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
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('AI response does not contain JSON');
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }
}

export async function validateYoutubeVideo(url: string) {
  const videoId = youtubeId(url);
  if (!videoId) return false;
  const { data, error } = await supabase.functions.invoke<{ valid?: unknown }>('ai', {
    body: { action: 'validate_youtube', videoId },
  });
  return !error && data?.valid === true;
}

export async function searchYoutubeVideo(query: string) {
  const { data, error } = await supabase.functions.invoke<{ video?: YoutubeVideoResult | null }>('ai', {
    body: { action: 'search_youtube', query },
  });
  return error ? null : data?.video ?? null;
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

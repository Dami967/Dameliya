import { loadSettings } from './userProfile';
import { languageName } from './languages';
import { supabase } from './supabase';
import type { AiAttachment } from './aiAttachments';

type AiResponse = { text?: unknown; error?: unknown };
export type YoutubeVideoResult = { language?: string; type: 'video'; title: string; url: string; description: string };

export async function askAi(prompt: string, system: string, attachments: AiAttachment[] = [], useMomentum = false,
  jsonResponse = false) {
  if (useMomentum) {
    const energy = await supabase.rpc('use_ai_momentum');
    if (energy.error) return { text: null, error: new Error('Не удалось проверить Momentum.') };
    if (typeof energy.data !== 'number' || energy.data < 0) return { text: null, error: new Error('Momentum закончился. Пройди викторину, напиши отчёт или немного подожди.') };
    window.dispatchEvent(new CustomEvent('momentum-changed', { detail: energy.data }));
  }
  const { data, error } = await supabase.functions.invoke<AiResponse>('ai', {
    timeout: 60_000,
    body: { prompt: prompt.trim(), system: system.trim(), attachments, json: jsonResponse },
  });
  if (error) return { text: null, error: await functionError(error) };
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

export async function searchYoutubeVideo(query: string, excludedUrl = '', previousUrls: string[] = []) {
  const { data: { session } } = await supabase.auth.getSession();
  const settings = session ? await loadSettings(session.user.id) : null;
  if (settings?.error) throw new Error('Не удалось проверить язык в настройках. Повтори подбор видео.');
  const language = settings?.data?.language ?? 'ru';
  const excludedVideoId = youtubeId(excludedUrl) ?? '';
  const { data, error } = await supabase.functions.invoke<{ video?: YoutubeVideoResult | null }>('ai', {
    body: { action: 'search_youtube', query: `${query}\nЯзык видео: ${language} (${languageName(language)}).`, language, excludedVideoId,
      excludedVideoIds: previousUrls.map(youtubeId).filter(Boolean) },
    timeout: 60_000,
  });
  const video = data?.video;
  if (error) throw new Error('Поиск видео сейчас недоступен. Проверь интернет и попробуй ещё раз.');
  return !error && video?.type === 'video' && typeof video.title === 'string'
    && typeof video.url === 'string' && typeof video.description === 'string' ? { ...video, language } : null;
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

async function functionError(error: { message: string; context?: unknown }) {
  if (error.context instanceof Response) {
    try {
      const body: unknown = await error.context.clone().json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        return new Error(body.error);
      }
    } catch { /* Keep a readable error when the response is not JSON. */ }
  }
  return new Error(readFunctionError(error.message));
}

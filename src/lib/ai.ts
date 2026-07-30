import { supabase } from './supabase';

type AiResponse = { text?: unknown; error?: unknown };

export async function askAi(prompt: string, system: string) {
  const { data, error } = await supabase.functions.invoke<AiResponse>('ai', {
    body: { prompt: prompt.trim(), system: system.trim() },
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

function readFunctionError(message: string) {
  if (message.includes('non-2xx')) return 'AI сейчас недоступен. Попробуй ещё раз немного позже.';
  return message || 'Не получилось обратиться к AI.';
}

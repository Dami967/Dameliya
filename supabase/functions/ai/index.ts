import { generateResponse } from './generateResponse.ts';
// AI-функция на бесплатном ключе Google Gemini.
// Вызов с фронта: supabase.functions.invoke('ai', { body: { prompt, system } })
//
// Запуск (один раз):
//   1) Добавь GEMINI_API_KEY в локальный .env
//   2) Загрузи секрет:  npm run ai:secret
//   3) Задеплой:        npm run ai:deploy

import { searchVideos } from './youtube.ts';
import { selectLessonVideo } from './videoSelection.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL = 'gemini-3.5-flash-lite';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: unknown }>;
    };
  }>;
};
type InlineAttachment = { name?: unknown; mimeType?: unknown; data?: unknown };
type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Используй POST-запрос' }, 405);

  try {
    const body = (await req.json()) as {
      prompt?: unknown; system?: unknown; action?: unknown; query?: unknown;
      language?: unknown; excludedVideoId?: unknown; excludedVideoIds?: unknown;
      attachments?: unknown; json?: unknown;
    };
    if (body.action === 'search_youtube') {
      let query = typeof body.query === 'string' ? body.query.trim().slice(0, 1500) : '';
      if (typeof body.language === 'string' && /^[a-z]{2,3}$/.test(body.language)) {
        query = query.replace(/\nЯзык видео:[^\n]*/g, '') + `\nЯзык видео: ${body.language}.`;
      }
      if (!query) return json({ video: null });
      const excluded = typeof body.excludedVideoId === 'string' ? body.excludedVideoId : '';
      const excludedIds = Array.isArray(body.excludedVideoIds)
        ? body.excludedVideoIds.filter((id): id is string => typeof id === 'string' && /^[\w-]{11}$/.test(id)).slice(-30) : [];
      const candidates = await searchVideos(query, excluded, excludedIds);
      try {
        const video = await selectLessonVideo(query, candidates, GEMINI_API_KEY, MODEL);
        // Selection already checks availability and handles temporary metadata outages.
        // Never reintroduce a candidate rejected as deleted or blocked.
        const fallback = video;
        return json({ video: fallback, reason: fallback ? null : candidates.length ? 'no_matching_video' : 'no_search_results' });
      } catch {
        return json({ error: 'Подбор видео временно недоступен. Попробуй снова.' }, 503);
      }
    }
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return json({ error: 'AI пока не настроен. Попроси наставника проверить секрет.' }, 503);
    }
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const system = typeof body.system === 'string' ? body.system.trim() : '';
    const expectsJson = body.json === true || /(?:валидн(?:ый|ым)|only) JSON/i.test(system);
    const rawAttachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 3) as InlineAttachment[] : [];

    if (!prompt) return json({ error: 'Напиши запрос для AI.' }, 400);
    if (prompt.length > 30_000 || system.length > 5_000) {
      return json({ error: 'Запрос слишком длинный. Сделай его короче.' }, 400);
    }
    const attachments = rawAttachments.filter((item) =>
      typeof item.mimeType === 'string' && typeof item.data === 'string'
      && item.data.length <= 14_000_000 && /^(image\/|audio\/|application\/pdf|text\/plain)/.test(item.mimeType));
    const totalSize = attachments.reduce((sum, item) => sum + String(item.data).length, 0);
    if (totalSize > 18_000_000) return json({ error: 'Вложения слишком большие.' }, 400);
    const parts: GeminiPart[] = [{ text: prompt }];
    attachments.forEach((item) => parts.push({
      inlineData: { mimeType: String(item.mimeType), data: String(item.data) },
    }));

    const response = await generateResponse(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents: [{ parts }],
          generationConfig: {
            maxOutputTokens: 8_192,
            ...(expectsJson ? { responseMimeType: 'application/json' } : {}),
          },
      },
    );

    const data = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      console.error('Gemini request failed', response.status, data);
      if (response.status === 429) {
        return json({ error: 'Лимит AI закончился. Попроси владельца GoalQuest пополнить баланс Gemini.' }, 429);
      }
      return json({ error: 'AI сейчас не ответил. Попробуй ещё раз чуть позже.' }, 502);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string' || !text.trim()) {
      console.error('Gemini returned an empty response', data);
      return json({ error: 'AI вернул пустой ответ. Попробуй переформулировать запрос.' }, 502);
    }

    return json({ text });
  } catch (error) {
    console.error('AI function failed', error);
    return json({ error: 'Не получилось обратиться к AI. Попробуй ещё раз.' }, 500);
  }
});

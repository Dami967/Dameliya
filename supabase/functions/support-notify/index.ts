const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPPORT_CHAT_ID = Deno.env.get('TELEGRAM_SUPPORT_CHAT_ID');
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!BOT_TOKEN || !SUPPORT_CHAT_ID) return json({ error: 'Telegram notifications are not configured' }, 503);
  try {
    const body = await request.json() as Record<string, unknown>;
    const mode = body.mode === 'bug' || body.mode === 'rate' ? body.mode : 'support';
    const subject = clean(body.subject, 120); const details = clean(body.details, 4000);
    if (subject.length < 2 || details.length < 2) return json({ error: 'Invalid request' }, 400);
    const identity = jwtIdentity(request.headers.get('authorization'));
    const labels = { support: '💬 Поддержка', bug: '🛠 Ошибка', rate: '⭐ Отзыв' };
    const text = [labels[mode], `Тема: ${subject}`, `От: ${identity.email || identity.sub || 'пользователь'}`,
      body.location ? `Раздел: ${clean(body.location, 100)}` : '', body.rating ? `Оценка: ${body.rating}/5` : '',
      '', details, '', `ID: ${clean(body.requestId, 80)}`].filter(Boolean).join('\n').slice(0, 4096);
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: SUPPORT_CHAT_ID, text }),
    });
    if (!response.ok) { console.error('Telegram sendMessage failed', response.status); return json({ error: 'Telegram failed' }, 502); }
    return json({ sent: true });
  } catch (error) {
    console.error('Support notification failed', error); return json({ error: 'Notification failed' }, 500);
  }
});

function clean(value: unknown, limit: number) { return typeof value === 'string' ? value.trim().slice(0, limit) : ''; }
function jwtIdentity(header: string | null) {
  try {
    const token = header?.replace(/^Bearer\s+/i, '') ?? ''; const part = token.split('.')[1] ?? '';
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(atob(normalized)) as { sub?: string; email?: string };
  } catch { return {} as { sub?: string; email?: string }; }
}

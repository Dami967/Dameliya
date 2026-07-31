import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const envText = await readFile('.env', 'utf8').catch(() => '');
const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_API_KEY
  || readEnv('TELEGRAM_BOT_TOKEN') || readEnv('TELEGRAM_BOT_API_KEY');
if (!token) fail('Добавь TELEGRAM_BOT_TOKEN в локальный .env и запусти команду снова.');

const bot = await telegram('getMe');
if (!bot.ok) fail('Telegram не принял токен бота. Проверь его в BotFather.');
const updates = await telegram('getUpdates?offset=-100');
const chats = (updates.result ?? []).flatMap((update) => {
  const message = update.message ?? update.edited_message ?? update.channel_post;
  return message?.chat?.id ? [{ id: String(message.chat.id), date: message.date ?? 0 }] : [];
}).sort((a, b) => b.date - a.date);
if (!chats[0]) fail('Открой своего бота в Telegram, нажми Start или отправь /start, затем запусти команду снова.');

const temporary = await mkdtemp(join(tmpdir(), 'goalquest-telegram-'));
const secretFile = join(temporary, 'telegram.env');
await writeFile(secretFile, `TELEGRAM_BOT_TOKEN=${token}\nTELEGRAM_SUPPORT_CHAT_ID=${chats[0].id}\n`, { mode: 0o600 });
const secretResult = spawnSync('npx', ['supabase', 'secrets', 'set', '--env-file', secretFile], { stdio: 'inherit' });
await rm(temporary, { recursive: true, force: true });
if (secretResult.status !== 0) fail('Не удалось сохранить секреты Supabase.');
const deploy = spawnSync('npx', ['supabase', 'functions', 'deploy', 'support-notify'], { stdio: 'inherit' });
if (deploy.status !== 0) fail('Не удалось задеплоить функцию уведомлений.');
const test = await telegram('sendMessage', { chat_id: chats[0].id, text: '✅ GoalQuest: уведомления поддержки подключены.' });
if (!test.ok) fail('Настройки сохранены, но тестовое сообщение не отправилось.');
console.log(`Telegram-поддержка подключена к @${bot.result.username}. Тестовое сообщение отправлено.`);

function readEnv(name) {
  const line = envText.split(/\r?\n/).find((item) => item.trim().startsWith(`${name}=`));
  return line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
}
async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  } : undefined);
  return response.json();
}
function fail(message) { console.error(message); process.exit(1); }

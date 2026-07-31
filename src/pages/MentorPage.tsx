import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { AiComposer } from '../components/AiComposer';
import { AppShell } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { askAi } from '../lib/ai';
import type { AiAttachment } from '../lib/aiAttachments';
import { createAiQuest, loadAiQuest } from '../lib/aiQuest';
import { useSession } from '../lib/useSession';

type Message = { role: 'q' | 'user'; text: string };

export function MentorPage() {
  const { session } = useSession();
  const [goal, setGoal] = useState('');
  const [request, setRequest] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'q', text: 'Привет! Расскажи о своей цели — я помогу превратить её в приключение.' }]);
  useEffect(() => {
    if (!session) return;
    if (new URLSearchParams(window.location.search).get('new') === '1') { setGoal(''); setRequest(''); return; }
    void loadAiQuest(session.user.id).then(({ data }) => data && setGoal(data.goal));
  }, [session]);
  async function adaptMap() {
    if (!session || goal.trim().length < 2) return;
    setBusy(true);
    setMessages((old) => [...old, { role: 'user', text: `Адаптируй карту: ${request || goal}` }]);
    const { data, error } = await createAiQuest(session.user.id, goal.trim(), request.trim());
    setMessages((old) => [...old, { role: 'q', text: error ? error.message : `Готово! Я создал карту «${data?.map_title}» из 10 шагов.` }]);
    setBusy(false);
  }
  async function send(text: string, attachments: AiAttachment[] = []) {
    if (!text || busy) return;
    setMessages((old) => [...old, { role: 'user', text }]);
    setBusy(true);
    const answer = await askAi(`Моя цель: ${goal || 'ещё не выбрана'}. Вопрос: ${text}`,
      'Ты Кью, добрый AI-наставник GoalQuest. Отвечай коротко, практично и на русском. Изучи приложенные фото, файлы или голосовое сообщение.', attachments, true);
    setMessages((old) => [...old, { role: 'q', text: answer.text ?? answer.error.message }]);
    setBusy(false);
  }
  return <AppShell><div className="mentor-page">
    <header><div><span className="mentor-avatar">Q</span><div><span className="eyebrow">AI-НАСТАВНИК</span><h1>Создай своё приключение</h1><p>Добавь цель, а Q превратит её в персональную карту.</p></div></div><Link href="/quest" className="social-outline">Открыть карту →</Link></header>
    <div className="mentor-layout"><aside className="goal-builder"><span className="eyebrow">ТВОЯ ЦЕЛЬ</span><h2>К чему ты хочешь прийти?</h2>
      <textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Например: подготовиться к IELTS за 4 месяца" maxLength={300} />
      <label>Как адаптировать маршрут?<textarea value={request} onChange={(event) => setRequest(event.target.value)} placeholder="У меня есть 30 минут в день, добавь больше практики…" /></label>
      <button className="social-primary" disabled={busy || goal.trim().length < 2} onClick={() => void adaptMap()}><Icon name="sparkles" size={17} />{busy ? 'Q создаёт карту…' : 'Создать или изменить карту'}</button>
      <small>Существующий прогресс изменится только после подтверждения новой карты.</small>
    </aside>
    <section className="mentor-chat-page"><div className="mentor-chat-log">{messages.map((message, index) => <p className={message.role} key={`${message.text}-${index}`}>{message.text}</p>)}{busy && <p className="q">Q думает…</p>}</div>
      <AiComposer busy={busy} name="message" placeholder="Спроси Q о своей цели…" onSend={(text, files) => void send(text, files)} /></section></div>
  </div></AppShell>;
}

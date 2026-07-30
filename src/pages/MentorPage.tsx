import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'wouter';
import { AppShell } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { createAiQuest, loadAiQuest } from '../lib/aiQuest';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/useSession';

type Message = { role: 'q' | 'user'; text: string };

export function MentorPage() {
  const { session } = useSession();
  const [goal, setGoal] = useState('');
  const [request, setRequest] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'q', text: 'Привет! Расскажи о своей цели — я помогу превратить её в приключение.' }]);
  useEffect(() => {
    if (session) void loadAiQuest(session.user.id).then(({ data }) => data && setGoal(data.goal));
  }, [session]);
  async function adaptMap() {
    if (!session || goal.trim().length < 2) return;
    setBusy(true);
    setMessages((old) => [...old, { role: 'user', text: `Адаптируй карту: ${request || goal}` }]);
    const { data, error } = await createAiQuest(session.user.id, goal.trim(), request.trim());
    setMessages((old) => [...old, { role: 'q', text: error ? error.message : `Готово! Я создал карту «${data?.map_title}» из 10 шагов.` }]);
    setBusy(false);
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = new FormData(form).get('message')?.toString().trim();
    if (!text || busy) return;
    setMessages((old) => [...old, { role: 'user', text }]);
    form.reset();
    setBusy(true);
    const { data } = await supabase.functions.invoke('ai', { body: { prompt: `Моя цель: ${goal || 'ещё не выбрана'}. Вопрос: ${text}`, system: 'Ты Q, добрый AI-наставник GoalQuest. Отвечай коротко, практично и на русском.' } });
    setMessages((old) => [...old, { role: 'q', text: data?.text || 'Попробуй спросить ещё раз.' }]);
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
      <form onSubmit={(event) => void send(event)}><input name="message" placeholder="Спроси Q о своей цели…" /><button disabled={busy}>↑</button></form></section></div>
  </div></AppShell>;
}

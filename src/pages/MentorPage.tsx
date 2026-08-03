import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AiComposer } from '../components/AiComposer';
import { AppShell } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { askAi } from '../lib/ai';
import type { AiAttachment } from '../lib/aiAttachments';
import { createAiQuest, loadAiQuests, type AiQuestPlan } from '../lib/aiQuest';
import { useSession } from '../lib/useSession';
import { compactMentorReply, conciseMentorRules } from '../lib/mentorStyle';
import { loadInterviewContext } from '../lib/interviewContext';
import { loadActiveQuest, rememberActiveQuest } from '../lib/activeQuest';

type Message = { role: 'q' | 'user'; text: string };

export function MentorPage() {
  const { session } = useSession();
  const [, navigate] = useLocation();
  const [goal, setGoal] = useState('');
  const [request, setRequest] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [plans, setPlans] = useState<AiQuestPlan[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([{ role: 'q', text: 'Привет! Расскажи о своей цели — я помогу превратить её в приключение.' }]);
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    void loadAiQuests(session.user.id).then(({ data }) => setPlans(data ?? []));
    if (params.get('new') === '1') { setMode('add'); setGoal(''); setRequest(''); return; }
    if (params.get('choose') === '1') { setMode(null); setGoal(''); setRequest(''); return; }
    void loadActiveQuest(session.user.id).then(({ data }) => data && setGoal(data.goal));
  }, [session]);
  async function adaptMap() {
    if (!session || goal.trim().length < 2) return;
    if (editingId && !window.confirm('Изменить выбранную цель? Карта заданий будет создана заново, а старый прогресс этой цели удалится.')) return;
    setBusy(true);
    setMessages((old) => [...old, { role: 'user', text: `Адаптируй карту: ${request || goal}` }]);
    const { data, error } = await createAiQuest(session.user.id, goal.trim(), request.trim(), editingId ?? undefined);
    setMessages((old) => [...old, { role: 'q', text: error ? error.message : `Готово! Я создал карту «${data?.map_title}» из 10 шагов.` }]);
    setBusy(false);
    if (data && !error) { rememberActiveQuest(data.id); navigate(`/quest?plan=${data.id}`); }
  }
  async function send(text: string, attachments: AiAttachment[] = []) {
    if (!text || busy) return;
    setMessages((old) => [...old, { role: 'user', text }]);
    setBusy(true);
    const interview = session ? await loadInterviewContext(session.user.id) : 'Данные интервью недоступны.';
    const answer = await askAi(`${interview}\nМоя цель: ${goal || 'ещё не выбрана'}. Вопрос: ${text}`,
      `Ты Кью, добрый AI-наставник GoalQuest. Изучи приложенные фото, файлы или голосовое сообщение.
Отвечай практично и на русском. ${conciseMentorRules}`, attachments, true);
    setMessages((old) => [...old, { role: 'q', text: compactMentorReply(answer.text ?? answer.error.message) }]);
    setBusy(false);
  }
  return <AppShell><div className="mentor-page">
    <header><div><span className="mentor-avatar">Q</span><div><span className="eyebrow">AI-НАСТАВНИК</span><h1>Создай своё приключение</h1><p>Добавь цель, а Q превратит её в персональную карту.</p></div></div><Link href="/quest" className="social-outline">Открыть карту →</Link></header>
    <div className="mentor-layout"><aside className="goal-builder"><span className="eyebrow">ТВОЯ ЦЕЛЬ</span><h2>К чему ты хочешь прийти?</h2>
      <div className="goal-mode-picker"><button className={mode === 'add' ? 'is-active' : ''} onClick={() => {
        setMode('add'); setEditingId(null); setGoal(''); setRequest('');
      }}>＋ Добавить цель</button><button className={mode === 'edit' ? 'is-active' : ''} onClick={() => setMode('edit')}>✎ Изменить цель</button></div>
      {mode === 'edit' && <div className="goal-edit-list">{plans.map((plan) => <button
        className={editingId === plan.id ? 'is-active' : ''} key={plan.id} onClick={() => {
          setEditingId(plan.id); setGoal(plan.goal); setRequest(''); rememberActiveQuest(plan.id);
        }}>{plan.goal}</button>)}</div>}
      <textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Например: подготовиться к IELTS за 4 месяца" maxLength={300} />
      <label>Как адаптировать маршрут?<textarea value={request} onChange={(event) => setRequest(event.target.value)} placeholder="У меня есть 30 минут в день, добавь больше практики…" /></label>
      <button className="social-primary" disabled={busy || goal.trim().length < 2 || mode === 'edit' && !editingId} onClick={() => void adaptMap()}><Icon name="sparkles" size={17} />{busy ? 'Q создаёт карту…' : editingId ? 'Сохранить изменения' : 'Создать новую карту'}</button>
      <small>Существующий прогресс изменится только после подтверждения новой карты.</small>
    </aside>
    <section className="mentor-chat-page"><div className="mentor-chat-log">{messages.map((message, index) => <p className={message.role} key={`${message.text}-${index}`}>{message.text}</p>)}{busy && <p className="q">Q думает…</p>}</div>
      <AiComposer busy={busy} name="message" placeholder="Спроси Q о своей цели…" onSend={(text, files) => void send(text, files)} /></section></div>
  </div></AppShell>;
}

import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AiComposer } from '../components/AiComposer';
import { AppShell } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { askAi, parseAiJson } from '../lib/ai';
import type { AiAttachment } from '../lib/aiAttachments';
import { createAiQuest, loadAiQuests, type AiQuestPlan } from '../lib/aiQuest';
import { useSession } from '../lib/useSession';
import { compactMentorReply, conciseMentorRules } from '../lib/mentorStyle';
import { loadInterviewContext } from '../lib/interviewContext';
import { loadActiveQuest, rememberActiveQuest } from '../lib/activeQuest';
import { detectLanguage, languageName } from '../lib/languages';

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
  const [messages, setMessages] = useState<Message[]>([{ role: 'q', text: mentorGreeting(detectLanguage()) }]);
  const editingPlan = plans.find((plan) => plan.id === editingId);
  const editingChat = mode === 'edit' && Boolean(editingPlan);
  const newOnly = new URLSearchParams(window.location.search).get('new') === '1';
  useLayoutEffect(() => {
    const scrollToStart = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    scrollToStart();
    const frame = window.requestAnimationFrame(scrollToStart);
    const timer = window.setTimeout(scrollToStart, 180);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, []);
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    void loadAiQuests(session.user.id).then(({ data }) => {
      const loaded = data ?? [];
      setPlans(loaded);
      if (editId) {
        setMode('edit');
        const selected = loaded.find((plan) => plan.id === editId);
        if (selected) selectPlanForEdit(selected);
      }
    });
    if (params.get('new') === '1') { setMode('add'); setGoal(''); setRequest(''); return; }
    if (editId) return;
    if (params.get('choose') === '1') { setMode(null); setGoal(''); setRequest(''); return; }
    void loadActiveQuest(session.user.id).then(({ data }) => data && setGoal(data.goal));
  }, [session]);
  function selectPlanForEdit(plan: AiQuestPlan) {
    setMode('edit'); setEditingId(plan.id); setGoal(plan.goal); setRequest(''); rememberActiveQuest(plan.id);
    setMessages([{ role: 'q', text: `Давай изменим цель «${plan.goal}». Расскажи, что тебя не устраивает и какой результат ты хочешь получить.` }]);
  }
  async function adaptMap() {
    if (!session || goal.trim().length < 2) return;
    const discussion = messages.filter((message) => message.role === 'user').map((message) => message.text).join('\n');
    if (editingId && !discussion) return;
    if (editingId && !window.confirm('Изменить выбранную цель? Карта заданий будет создана заново, а старый прогресс этой цели удалится.')) return;
    setBusy(true);
    let nextGoal = goal.trim();
    let adaptationRequest = request.trim();
    if (editingId) {
      const summary = await askAi(`Текущая цель: ${goal}. Обсуждение изменений:\n${discussion}\n
Верни JSON: {"goal":"обновлённая конкретная цель","request":"все требования пользователя к новой карте"}.`,
      'Ты превращаешь обсуждение пользователя с наставником в точную цель и требования. Не добавляй пожелания от себя. Только валидный JSON.', [], false, true);
      try {
        const parsed = parseAiJson<{ goal?: unknown; request?: unknown }>(summary.text ?? '');
        if (typeof parsed.goal === 'string' && parsed.goal.trim()) nextGoal = parsed.goal.trim();
        if (typeof parsed.request === 'string') adaptationRequest = parsed.request.trim();
      } catch { adaptationRequest = discussion; }
    }
    setMessages((old) => [...old, { role: 'user', text: 'Адаптируй карту по нашему обсуждению.' }]);
    const { data, error } = await createAiQuest(session.user.id, nextGoal,
      adaptationRequest || discussion, editingId ?? undefined);
    setMessages((old) => [...old, { role: 'q', text: error ? error.message : `Готово! Я создал карту «${data?.map_title}» из 10 шагов.` }]);
    setBusy(false);
    if (data && !error) { rememberActiveQuest(data.id); navigate(`/quest?plan=${data.id}`); }
  }
  async function send(text: string, attachments: AiAttachment[] = []) {
    if (!text || busy) return;
    setMessages((old) => [...old, { role: 'user', text }]);
    setBusy(true);
    const interview = session ? await loadInterviewContext(session.user.id) : 'Данные интервью недоступны.';
    const answerLanguage = languageName(detectLanguage());
    const discussion = messages.map((message) => `${message.role === 'user' ? 'Пользователь' : 'Кью'}: ${message.text}`).join('\n');
    const mapContext = editingPlan ? `Текущая карта: ${editingPlan.steps.map((step) => step.title).join(' → ')}.` : '';
    const answer = await askAi(`${interview}\nМоя цель: ${goal || 'ещё не выбрана'}. ${mapContext}
Предыдущее обсуждение:\n${discussion}\nНовое сообщение: ${text}`,
      `Ты Кью, добрый AI-наставник GoalQuest. Изучи приложенные фото, файлы или голосовое сообщение.
Всегда отвечай на языке ${answerLanguage}, независимо от языка сохранённой цели.
Если пользователь изменяет цель, помоги обсудить новый результат, сроки, сложность и формат заданий. Задавай один полезный уточняющий вопрос за раз. Не говори, что карта уже изменена: она изменится только после кнопки «Адаптировать карту». ${conciseMentorRules}`, attachments, true);
    setMessages((old) => [...old, { role: 'q', text: compactMentorReply(answer.text ?? answer.error.message) }]);
    setBusy(false);
  }
  return <AppShell><div className="mentor-page">
    <header><div><span className="mentor-avatar">Q</span><div><span className="eyebrow">AI-НАСТАВНИК</span><h1>Создай своё приключение</h1><p>Добавь цель, а Q превратит её в персональную карту.</p></div></div><Link href="/quest" className="social-outline">Открыть карту →</Link></header>
    <div className={`mentor-layout ${editingChat ? 'mentor-layout--chat-only' : ''}`}>{!editingChat && <aside className="goal-builder"><span className="eyebrow">ТВОЯ ЦЕЛЬ</span><h2>К чему ты хочешь прийти?</h2>
      {!newOnly && <div className="goal-mode-picker"><button className={mode === 'add' ? 'is-active' : ''} onClick={() => {
        setMode('add'); setEditingId(null); setGoal(''); setRequest('');
      }}>＋ Добавить цель</button><button className={mode === 'edit' ? 'is-active' : ''} onClick={() => {
        setMode('edit'); setEditingId(null); setGoal(''); setRequest('');
        if (plans.length === 1) selectPlanForEdit(plans[0]);
      }}>✎ Изменить цель</button></div>}
      {mode === 'edit' && <div className="goal-edit-list">{plans.map((plan) => <button
        className={editingId === plan.id ? 'is-active' : ''} key={plan.id} onClick={() => {
          selectPlanForEdit(plan);
        }}>{plan.goal}</button>)}</div>}
      {mode === 'add' && <><textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Например: подготовиться к IELTS за 4 месяца" maxLength={300} />
      <label>Как адаптировать маршрут?<textarea value={request} onChange={(event) => setRequest(event.target.value)} placeholder="У меня есть 30 минут в день, добавь больше практики…" /></label>
      <button className="social-primary" disabled={busy || goal.trim().length < 2} onClick={() => void adaptMap()}><Icon name="sparkles" size={17} />{busy ? 'Q создаёт карту…' : 'Создать новую карту'}</button>
      <small>Новая карта появится после подтверждения.</small></>}
    </aside>}
    <section className="mentor-chat-page">{editingChat && <div className="mentor-edit-banner"><div><small>ИЗМЕНЕНИЕ ЦЕЛИ</small><b>{goal}</b></div>
      <button onClick={() => { setEditingId(null); setGoal(''); setMessages([{ role: 'q', text: mentorGreeting(detectLanguage()) }]); }}>Выбрать другую</button></div>}
      <div className="mentor-chat-log">{messages.map((message, index) => <p className={message.role} key={`${message.text}-${index}`}>{message.text}</p>)}{busy && <p className="q">Q думает…</p>}</div>
      <AiComposer busy={busy} name="message" placeholder={editingChat ? 'Расскажи, что изменить в цели и карте…' : 'Спроси Q о своей цели…'} onSend={(text, files) => void send(text, files)} />
      {editingChat && <div className="mentor-adapt-bar"><small>Кью учтёт всю переписку и заново соберёт 10 этапов.</small>
        <button className="social-primary" disabled={busy || !messages.some((message) => message.role === 'user')} onClick={() => void adaptMap()}>
          <Icon name="sparkles" size={17} />{busy ? 'Адаптирую карту…' : 'Адаптировать карту'}</button></div>}</section></div>
  </div></AppShell>;
}

function mentorGreeting(language: string) {
  if (language === 'ru') return 'Привет! Расскажи о своей цели — я помогу превратить её в приключение.';
  if (language === 'kk') return 'Сәлем! Мақсатың туралы айт — мен оны шытырманға айналдыруға көмектесемін.';
  return 'Hi! Tell me about your goal, and I will help turn it into an adventure.';
}

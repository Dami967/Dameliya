import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { CompletedTaskChoice } from '../components/CompletedTaskChoice';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { Icon } from '../components/Icon';
import { TaskMentor } from '../components/TaskMentor';
import { TaskResources } from '../components/TaskResources';
import { ensureQuestTaskDetails, loadAiQuest, loadAiQuestById, normalizeQuestStep, type AiQuestPlan } from '../lib/aiQuest';
import { questSteps, type QuestStep, type QuestTaskDetails } from '../lib/questData';
import { completeQuestTask, loadTaskRecord, saveTaskRecord,
  type TaskChatMessage, type TaskRecord } from '../lib/taskRecords';
import { adaptFutureQuest } from '../lib/adaptiveQuest';
import { useSession } from '../lib/useSession';
import { loadQuestLearning } from '../lib/questLearning';

type View = 'lesson' | 'choice' | 'history';

export function TaskPage() {
  const { session } = useSession();
  const [, params] = useRoute('/task/:id');
  const [, navigate] = useLocation();
  const [plan, setPlan] = useState<AiQuestPlan | null>(null);
  const [step, setStep] = useState<QuestStep | null>(null);
  const [record, setRecord] = useState<TaskRecord | null>(null);
  const [notes, setNotes] = useState('');
  const [chat, setChat] = useState<TaskChatMessage[]>([]);
  const [view, setView] = useState<View>('lesson');
  const [completing, setCompleting] = useState(false);
  const [learningContext, setLearningContext] = useState('');
  const stepId = Number(params?.id) || 0;
  const planId = new URLSearchParams(window.location.search).get('plan');

  useEffect(() => {
    if (!session) return;
    const request = planId ? loadAiQuestById(session.user.id, planId) : loadAiQuest(session.user.id);
    void request.then(async ({ data: currentPlan }) => {
      const selectedId = stepId || currentPlan?.steps.find((item) => item.state === 'active')?.id || 1;
      if (!currentPlan) {
        setStep(questSteps.find((item) => item.id === selectedId) ?? questSteps[0]);
        return;
      }
      const normalized = normalizeQuestStep(currentPlan.steps.find((item) => item.id === selectedId) ?? currentPlan.steps[0]);
      const immediate = { ...normalized, details: { ...normalized.details!, resources: [] } };
      setPlan({ ...currentPlan, steps: currentPlan.steps.map((item) => item.id === immediate.id ? immediate : item) });
      setStep(immediate);
      const saved = await loadTaskRecord(session.user.id, currentPlan.goal, immediate.id);
      setRecord(saved.data ?? null); setNotes(saved.data?.notes ?? ''); setChat(saved.data?.chat ?? []);
      const learning = await loadQuestLearning(session.user.id, currentPlan.goal);
      setLearningContext(learning.context);
      setView(immediate.state === 'done' ? 'choice' : 'lesson');
      const detailResult = await ensureQuestTaskDetails(session.user.id, currentPlan, selectedId);
      const selected = detailResult.data ?? immediate;
      setPlan({ ...currentPlan, steps: currentPlan.steps.map((item) => item.id === selected.id ? selected : item) });
      setStep(selected);
    });
  }, [planId, session, stepId]);

  useEffect(() => {
    if (!session || !plan || !step) return;
    const timer = window.setTimeout(() => {
      void saveTaskRecord(session.user.id, plan.goal, step.id, { notes, chat });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [chat, notes, plan, session, step]);

  if (!step) return <main className="center-loader">Кью адаптирует задание под твою цель…</main>;
  if (view === 'choice') return <CompletedTaskChoice step={step} record={record}
    onHistory={() => setView('history')} onReplay={() => {
      setView('lesson');
      if (session && plan) void saveTaskRecord(session.user.id, plan.goal, step.id,
        { attempts: (record?.attempts ?? 1) + 1 });
    }} />;

  const activeStep = step;
  const details = activeStep.details ?? defaultDetails(activeStep);
  const total = plan?.steps.length ?? 10;
  const taskContext = `Цель: ${plan?.goal || 'пройти квест'}. Задание: ${activeStep.title}. ${details.objective}`;

  async function finish() {
    if (completing) return;
    setCompleting(true);
    if (session && plan) {
      await completeQuestTask(session.user.id, plan, activeStep.id, notes, chat);
      await adaptFutureQuest(session.user.id, plan, activeStep.id);
    }
    window.setTimeout(() => navigate(`/quest${plan ? `?plan=${plan.id}` : ''}`), 900);
  }

  return <div className="task-page">
    <header className="task-topbar"><Link href={`/quest${plan ? `?plan=${plan.id}` : ''}`} className="back-link">← <span>К карте</span></Link>
      <div className="task-topbar__progress"><span>Этап {activeStep.id} из {total}</span>
        <div><i style={{ width: `${activeStep.id / total * 100}%` }} /></div></div>
      <span className="stat-chip stat-chip--xp"><Icon name="zap" size={18} />+{activeStep.xp} XP</span>
    </header>
    <main className="task-layout"><article className="task-main">
      {view === 'history' && <div className="history-mode"><b>Сохранённые материалы прошлого прохождения</b>
        <button onClick={() => setView('lesson')}>Пройти заново</button></div>}
      <span className="task-label"><Icon name="sparkles" size={16} /> ПЕРСОНАЛЬНОЕ ЗАДАНИЕ ОТ КЬЮ</span>
      <h1>{activeStep.title}</h1><p className="task-lead">{details.objective}</p>
      <div className="task-info"><span><Icon name="clock" size={18} />{details.duration_minutes} минут</span>
        <span><Icon name="zap" size={18} />+{activeStep.xp} XP</span><span><Icon name="target" size={18} />{details.category}</span></div>
      <section className="content-card"><h2>Что нужно сделать</h2><ol className="steps-list">
        {details.checklist.map((item, index) => <li key={`${item.title}-${index}`}><span>{index + 1}</span>
          <p><b>{item.title}</b><small><LinkedText text={item.hint} /></small></p></li>)}</ol></section>
      <TaskResources resources={details.resources} notes={notes} task={taskContext} chat={chat}
        onNotes={setNotes} onChat={setChat} />
      <section className="content-card"><h2>Заметки этого квеста</h2><textarea value={notes}
        onChange={(event) => setNotes(event.target.value)} placeholder="Записывай сюда результаты именно этого задания…" />
        <small className="autosave">{notes ? 'Сохранено внутри задания' : 'Не попадёт в личную записную книжку'}</small></section>
      {view !== 'history' && <button className={`complete-button ${completing ? 'is-done' : ''}`} onClick={() => void finish()}>
        <Icon name="check" />{completing ? 'Кью анализирует результаты и обновляет маршрут…' : activeStep.state === 'done' ? 'Завершить повтор' : 'Я выполнила задание'}</button>}
    </article><TaskMentor task={taskContext} notes={notes} learningContext={learningContext}
      initialMessages={chat} onMessages={setChat} /></main>
    {completing && <CompletionCelebration onClose={() => navigate('/quest')} />}
  </div>;
}

function LinkedText({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s<>"']+)/gi);
  return <>{parts.map((part, index) => part.startsWith('https://')
    ? <a className="task-inline-link" href={part.replace(/[),.;!?]+$/g, '')}
      target="_blank" rel="noreferrer" key={`${part}-${index}`}>{part}</a>
    : part)}</>;
}

function defaultDetails(step: QuestStep): QuestTaskDetails {
  return { objective: step.subtitle, duration_minutes: 25, category: 'Практика', resources: [], checklist: [
    { title: 'Определи результат', hint: `Запиши ожидаемый итог этапа «${step.title}».` },
    { title: 'Выполни основной шаг', hint: 'Сосредоточься на одном небольшом измеримом результате.' },
    { title: 'Зафиксируй итог', hint: 'Сохрани результат и отметь, что получилось.' },
  ] };
}

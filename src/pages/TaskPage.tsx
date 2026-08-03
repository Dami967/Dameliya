import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { CompletedTaskChoice } from '../components/CompletedTaskChoice';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { Icon } from '../components/Icon';
import { TaskMentor } from '../components/TaskMentor';
import { TaskResources } from '../components/TaskResources';
import { ensureQuestTaskDetails, loadAiQuest, loadAiQuestById, normalizeQuestStep, type AiQuestPlan } from '../lib/aiQuest';
import { questSteps, type QuestStep } from '../lib/questData';
import { completeQuestTask, loadTaskRecord, saveTaskRecord,
  type TaskChatMessage, type TaskRecord } from '../lib/taskRecords';
import { adaptFutureQuest } from '../lib/adaptiveQuest';
import { useSession } from '../lib/useSession';
import { loadQuestLearning } from '../lib/questLearning';
import { validateTaskResult, type ValidationResult } from '../lib/taskValidation';
import { loadProfile } from '../lib/userProfile';
import { loadHomeProgress } from '../lib/homeProgress';
import { defaultTaskDetails, LinkedTaskText } from '../components/TaskChecklist';
import { TaskAttachments } from '../components/TaskAttachments';
import type { TaskAttachment } from '../lib/taskAttachments';
import { TaskValidationResult } from '../components/TaskValidationResult';

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
  const [celebrating, setCelebrating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [rewardStats, setRewardStats] = useState({ xp: 0, streak: 0, level: 1 });
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [learningContext, setLearningContext] = useState('');
  const [resourcesLoading, setResourcesLoading] = useState(false);
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
      const immediate = normalized;
      setPlan({ ...currentPlan, steps: currentPlan.steps.map((item) => item.id === immediate.id ? immediate : item) });
      setStep(immediate);
      const saved = await loadTaskRecord(session.user.id, currentPlan.goal, immediate.id);
      setRecord(saved.data ?? null); setNotes(saved.data?.notes ?? ''); setChat(saved.data?.chat ?? []);
      const learning = await loadQuestLearning(session.user.id, currentPlan.goal);
      setLearningContext(learning.context);
      setView(immediate.state === 'done' ? 'choice' : 'lesson');
      setResourcesLoading(true);
      const detailResult = await ensureQuestTaskDetails(session.user.id, currentPlan, selectedId);
      const selected = detailResult.data ?? immediate;
      setPlan({ ...currentPlan, steps: currentPlan.steps.map((item) => item.id === selected.id ? selected : item) });
      setStep(selected);
      setResourcesLoading(false);
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
  const details = activeStep.details ?? defaultTaskDetails(activeStep);
  const expectsVideo = /видео|video|youtube|прослушай/i.test(`${details.objective} ${details.checklist.map((item) => `${item.title} ${item.hint}`).join(' ')}`);
  const total = plan?.steps.length ?? 10;
  const taskContext = `Цель: ${plan?.goal || 'пройти квест'}. Задание: ${activeStep.title}. ${details.objective}`;

  async function finish() {
    if (completing) return;
    setCompleting(true);
    setValidationResult(null);
    if (session && plan) {
      const validation = await validateTaskResult(plan.goal, activeStep, notes, chat, attachments);
      setValidationResult(validation);
      if (!validation.passed) {
        setCompleting(false); return;
      }
      const completion = await completeQuestTask(session.user.id, plan, activeStep.id, notes, chat);
      if (completion.error) {
        setValidationResult({ passed: false, feedback: 'Не удалось сохранить результат. Попробуй ещё раз.',
          expected_answer: details.expected_answer, comparisons: [] }); setCompleting(false); return;
      }
      const [profileResult, progress] = await Promise.all([
        loadProfile(session.user.id), loadHomeProgress(session.user.id),
      ]);
      setRewardStats({ xp: activeStep.state === 'done' ? 0 : activeStep.xp,
        streak: progress.streak, level: profileResult.data?.level ?? 1 });
      setCelebrating(true); setCompleting(false);
      void adaptFutureQuest(session.user.id, plan, activeStep.id);
    }
  }

  async function findTaskVideo() {
    if (!session || !plan || resourcesLoading) return;
    setResourcesLoading(true);
    const result = await ensureQuestTaskDetails(session.user.id, plan, activeStep.id);
    if (result.data) {
      setStep(result.data);
      setPlan({ ...plan, steps: plan.steps.map((item) => item.id === result.data?.id ? result.data : item) });
    }
    setResourcesLoading(false);
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
          <p><b>{item.title}</b><small><LinkedTaskText text={item.hint} /></small></p></li>)}</ol></section>
      <TaskResources resources={details.resources} loading={resourcesLoading} expectsVideo={expectsVideo}
        notes={notes} task={taskContext} chat={chat} readOnly={view === 'history'} onFindVideo={() => void findTaskVideo()}
        onNotes={setNotes} onChat={setChat} />
      <section className="content-card"><h2>Заметки этого квеста</h2><textarea value={notes} readOnly={view === 'history'}
        onChange={(event) => setNotes(event.target.value)} placeholder="Записывай сюда результаты именно этого задания…" />
        <small className="autosave">{notes ? 'Сохранено внутри задания' : 'Не попадёт в личную записную книжку'}</small></section>
      {session && plan && <section className="content-card"><TaskAttachments userId={session.user.id}
        planId={plan.id} stepId={activeStep.id} readOnly={view === 'history'} onChange={setAttachments} /></section>}
      {view !== 'history' && <button className={`complete-button ${completing ? 'is-done' : ''}`} onClick={() => void finish()}>
        <Icon name="check" />{completing ? 'Кью проверяет качество результата…' : activeStep.state === 'done' ? 'Завершить повтор' : 'Я выполнила задание'}</button>}
      {validationResult && !validationResult.passed && <TaskValidationResult result={validationResult} />}
    </article><TaskMentor task={taskContext} notes={notes} learningContext={learningContext} readOnly={view === 'history'}
      initialMessages={chat} onMessages={setChat} /></main>
    {celebrating && <CompletionCelebration xp={rewardStats.xp} streak={rewardStats.streak}
      level={rewardStats.level} goal={plan?.goal || 'своей цели'}
      onClose={() => navigate(`/quest${plan ? `?plan=${plan.id}` : ''}`)} />}
  </div>;
}

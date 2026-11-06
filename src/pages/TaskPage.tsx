import { useSettings } from '../lib/useSettings';
import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { CompletedTaskChoice } from '../components/CompletedTaskChoice';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { Icon } from '../components/Icon';
import { TaskMentor } from '../components/TaskMentor';
import { TaskResources } from '../components/TaskResources';
import { completeQuestTask, saveTaskRecord } from '../lib/taskRecords';
import { adaptFutureQuest } from '../lib/adaptiveQuest';
import { useSession } from '../lib/useSession';
import { validateTaskResult, type ValidationResult } from '../lib/taskValidation';
import { loadProfile } from '../lib/userProfile';
import { loadHomeProgress } from '../lib/homeProgress';
import { defaultTaskDetails, LinkedTaskText } from '../components/TaskChecklist';
import { TaskAttachments } from '../components/TaskAttachments';
import type { TaskAttachment } from '../lib/taskAttachments';
import { useQuestTask } from '../lib/useQuestTask';
import { TaskWorkbook } from '../components/TaskWorkbook';
import { readExerciseNotes, writeExerciseNotes } from '../lib/exerciseAnswers';
import { TaskValidationResult } from '../components/TaskValidationResult';

type View = 'lesson' | 'choice' | 'history';

export function TaskPage() {
  const { session } = useSession();
  const { settings } = useSettings(session?.user.id);
  const [, params] = useRoute('/task/:id');
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>('lesson');
  const [completing, setCompleting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [rewardStats, setRewardStats] = useState({ xp: 0, streak: 0, level: 1 });
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const stepId = Number(params?.id) || 0;
  const planId = new URLSearchParams(window.location.search).get('plan');

  const { plan, step, record, notes, setNotes, chat, setChat, learningContext, resourcesLoading,
    lessonReady, lessonLoading, loadError, saveError, retry } = useQuestTask(session?.user.id, planId, stepId);
  useEffect(() => { setView(step?.state === 'done' ? 'choice' : 'lesson'); }, [step?.id, plan?.id]);

  if (!step) return <main className="center-loader">{loadError || 'Кью адаптирует задание под твою цель…'}</main>;
  if (view === 'choice') return <CompletedTaskChoice step={step} record={record}
    onHistory={() => setView('history')} onReplay={() => {
      setView('lesson');
      if (session && plan) void saveTaskRecord(session.user.id, plan.goal, step.id,
        { attempts: (record?.attempts ?? 1) + 1 });
    }} />;

  const activeStep = step;
  const details = activeStep.details ?? defaultTaskDetails(activeStep);
  const savedNotes = readExerciseNotes(notes);
  const mentorContext = `${JSON.stringify(details.lesson ?? {})}`;
  const total = plan?.steps.length ?? 10;
  const taskContext = `Задание: ${activeStep.title}. Цель: ${plan?.goal || 'пройти квест'}. ${details.objective}`;

  async function finish() {
    if (completing || lessonLoading || !details.lesson) return;
    setCompleting(true);
    setValidationResult(null);
    if (session && plan) {
      const validation = await validateTaskResult(plan.goal, activeStep, notes, chat, attachments);
      setValidationResult(validation);
      if (!validation.passed) {
        setCompleting(false); return;
      }
      const completion = await completeQuestTask(plan, activeStep.id, notes, chat);
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
      if (activeStep.state !== 'done') void adaptFutureQuest(session.user.id, plan, activeStep.id);
    }
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
      <h1>{lessonReady ? activeStep.title : 'Твой урок'}</h1>
      <p className="task-lead">{lessonReady ? details.objective : 'Видео, заметки и сохранённые ответы доступны, пока мы готовим перевод урока.'}</p>
      <div className="task-info"><span><Icon name="clock" size={18} />{details.duration_minutes} минут</span>
        <span><Icon name="zap" size={18} />+{activeStep.xp} XP</span><span><Icon name="target" size={18} />{lessonReady ? details.category : 'Урок'}</span></div>
      <TaskResources language={settings?.language ?? 'ru'} resources={details.resources} loading={resourcesLoading || lessonLoading} expectsVideo={true}
        notes={notes} task={taskContext} chat={chat} readOnly={view === 'history'}
        onNotes={setNotes} onChat={setChat} />
      {loadError && <p role="alert">{loadError} Сохранённые задания остаются доступны. <button onClick={retry}>Попробовать снова</button></p>}
      {!lessonReady ? <section className="content-card" role="status"><p>{lessonLoading ? 'Кью переводит урок на язык из настроек…' : 'Перевод пока недоступен. Сохранённый урок и твои ответы не удалены.'}</p></section> : details.lesson ? <TaskWorkbook lesson={details.lesson} notes={notes} readOnly={view === 'history'} onNotes={setNotes} />
        : <section className="content-card"><p>{lessonLoading ? 'Кью готовит объяснение, примеры и упражнения…' : 'Полный урок ещё не загружен.'}</p>
          <button disabled={lessonLoading} onClick={retry}>Подготовить урок</button></section>}
      {details.checklist.length > 0 && <section className="content-card"><h2>Что нужно сделать</h2><ol className="steps-list">
        {details.checklist.map((item, index) => <li key={`${item.title}-${index}`}><span>{index + 1}</span>
          <p><b>{item.title}</b><small><LinkedTaskText text={item.hint} /></small></p></li>)}</ol></section>}
      <section className="content-card"><h2>Заметки этого квеста</h2><textarea value={savedNotes.notes} readOnly={view === 'history'}
        onChange={(event) => setNotes(writeExerciseNotes(event.target.value, savedNotes.answers, details.lesson))} placeholder="Записывай сюда результаты именно этого задания…" />
        <small className="autosave">{saveError || 'Заметки и ответы автоматически сохраняются в задании'}</small></section>
      {session && plan && <section className="content-card"><TaskAttachments userId={session.user.id}
        planId={plan.id} stepId={activeStep.id} readOnly={view === 'history'} onChange={setAttachments} /></section>}
      {view !== 'history' && <button disabled={completing || !lessonReady || lessonLoading || !details.lesson} className={`complete-button ${completing ? 'is-done' : ''}`} onClick={() => void finish()}>
        <Icon name="check" />{completing ? 'Кью проверяет качество результата…' : activeStep.state === 'done' ? 'Завершить повтор' : 'Я выполнила задание'}</button>}
      {validationResult && !validationResult.passed && <TaskValidationResult result={validationResult} />}
    </article><TaskMentor task={taskContext} notes={notes} learningContext={`${learningContext}\nМатериал и упражнения текущего урока: ${mentorContext}`} readOnly={view === 'history'}
      initialMessages={chat} onMessages={setChat} /></main>
    {celebrating && <CompletionCelebration xp={rewardStats.xp} streak={rewardStats.streak}
      level={rewardStats.level} goal={plan?.goal || 'своей цели'}
      onClose={() => navigate(plan ? `/review/${plan.id}/${activeStep.id}` : '/quest')} />}
  </div>;
}

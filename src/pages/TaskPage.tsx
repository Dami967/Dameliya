import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { Icon } from '../components/Icon';
import { TaskMentor } from '../components/TaskMentor';
import { ensureQuestTaskDetails, loadAiQuest } from '../lib/aiQuest';
import { questSteps, type QuestStep, type QuestTaskDetails } from '../lib/questData';
import { useSession } from '../lib/useSession';

export function TaskPage() {
  const { session } = useSession();
  const [, params] = useRoute('/task/:id');
  const [step, setStep] = useState<QuestStep | null>(null);
  const [goal, setGoal] = useState('');
  const [total, setTotal] = useState(10);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const stepId = Number(params?.id) || 0;

  useEffect(() => {
    if (!session) return;
    void loadAiQuest(session.user.id).then(async ({ data: plan }) => {
      if (!plan) {
        setStep(questSteps.find((item) => item.id === stepId) ?? questSteps.find((item) => item.state === 'active')!);
        return;
      }
      const selected = stepId || plan.steps.find((item) => item.state === 'active')?.id || 1;
      setGoal(plan.goal); setTotal(plan.steps.length);
      const result = await ensureQuestTaskDetails(session.user.id, plan, selected);
      setStep(result.data ?? plan.steps[0]);
    });
  }, [session, stepId]);

  if (!step) return <main className="center-loader">Кью адаптирует задание под твою цель…</main>;
  const details = step.details ?? defaultDetails(step);
  const position = Math.max(1, step.id);
  const taskContext = `Цель: ${goal || 'пройти квест'}. Задание: ${step.title}. ${details.objective}`;

  return <div className="task-page">
    <header className="task-topbar">
      <Link href="/quest" className="back-link">← <span>К карте</span></Link>
      <div className="task-topbar__progress"><span>Этап {position} из {total}</span>
        <div><i style={{ width: `${position / total * 100}%` }} /></div></div>
      <span className="stat-chip stat-chip--xp"><Icon name="zap" size={18} />+{step.xp} XP</span>
    </header>
    <main className="task-layout">
      <article className="task-main">
        <span className="task-label"><Icon name="sparkles" size={16} /> ПЕРСОНАЛЬНОЕ ЗАДАНИЕ ОТ КЬЮ</span>
        <h1>{step.title}</h1><p className="task-lead">{details.objective}</p>
        <div className="task-info">
          <span><Icon name="clock" size={18} />{details.duration_minutes} минут</span>
          <span><Icon name="zap" size={18} />+{step.xp} XP</span>
          <span><Icon name="target" size={18} />{details.category}</span>
        </div>
        <section className="content-card"><h2>Что нужно сделать</h2>
          <ol className="steps-list">{details.checklist.map((item, index) =>
            <li key={`${item.title}-${index}`}><span>{index + 1}</span><p><b>{item.title}</b><small>{item.hint}</small></p></li>)}
          </ol>
        </section>
        <section className="content-card"><h2>Заметки этого квеста</h2>
          <textarea value={note} onChange={(event) => setNote(event.target.value)}
            placeholder="Записывай сюда результаты именно этого задания…" />
          <small className="autosave">{note ? 'Сохранено внутри задания' : 'Эта заметка не попадёт в личную записную книжку'}</small>
        </section>
        <button className={`complete-button ${done ? 'is-done' : ''}`} onClick={() => setDone(true)}>
          <Icon name="check" /> {done ? `Задание выполнено! +${step.xp} XP` : 'Я выполнила задание'}
        </button>
      </article>
      <TaskMentor task={taskContext} notes={note} />
    </main>
    {done && <CompletionCelebration onClose={() => setDone(false)} />}
  </div>;
}

function defaultDetails(step: QuestStep): QuestTaskDetails {
  return { objective: step.subtitle, duration_minutes: 25, category: 'Практика', checklist: [
    { title: 'Определи результат', hint: `Запиши ожидаемый итог этапа «${step.title}».` },
    { title: 'Выполни основной шаг', hint: 'Сосредоточься на одном небольшом измеримом результате.' },
    { title: 'Зафиксируй итог', hint: 'Сохрани результат и отметь, что получилось.' },
  ] };
}

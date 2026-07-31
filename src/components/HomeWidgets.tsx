import { Link } from 'wouter';
import { Icon } from './Icon';
import { NewNoteButton } from './NewNoteButton';
import type { AiQuestPlan } from '../lib/aiQuest';

export function TodayTasks({ plan }: { plan: AiQuestPlan | null }) {
  const activeIndex = plan?.steps.findIndex((step) => step.state === 'active') ?? -1;
  const tasks = plan && activeIndex >= 0
    ? plan.steps.slice(activeIndex, activeIndex + 3)
    : plan?.steps.filter((step) => step.state === 'done').slice(-3) ?? [];
  const completed = tasks.filter((task) => task.state === 'done').length;
  return (
    <section className="home-panel today-panel">
      <div className="section-heading"><div><span className="eyebrow">ПЛАН ПО ТВОЕЙ ЦЕЛИ</span><h2>Ближайшие задания</h2></div>
        <b className="tasks-count">{completed} / {tasks.length}</b></div>
      <div className="today-list">
        {tasks.map((task) => (
          <Link href={`/task/${task.id}?plan=${plan?.id}`} className={`today-task ${task.state === 'done' ? 'is-done' : ''}`} key={task.id}>
            <span className="task-check">{task.state === 'done' && <Icon name="check" size={14} />}</span>
            <div><b>{task.title}</b><small>{task.details?.duration_minutes ?? 25} мин · +{task.xp} XP</small></div>
            <Icon name="arrow" size={15} />
          </Link>
        ))}
        {!tasks.length && <p>Создай цель — Кью сразу подготовит первые шаги.</p>}
      </div>
    </section>
  );
}

export function AiTip({ goal }: { goal?: string }) {
  return (
    <section className="home-panel ai-tip">
      <img src="/goalquest-q-tip-star.png" alt="Фиолетовая звезда GoalQuest" />
      <div><span className="eyebrow">СОВЕТ ОТ КЬЮ</span><p>{goal
        ? `Сегодня сделай один небольшой шаг к цели «${goal}». Сосредоточься на результате, а не на идеальности.`
        : 'Начни с одной важной цели — Кью поможет разбить её на небольшие шаги.'}</p></div>
    </section>
  );
}

export function WeekProgress() {
  const values = [42, 68, 55, 84, 62, 94, 74];
  return (
    <section className="home-panel week-panel">
      <div className="section-heading"><div><span className="eyebrow">ТВОЙ РИТМ</span><h2>Недельный прогресс</h2></div><span className="week-growth">↗ 18%</span></div>
      <div className="week-chart">
        {values.map((value, index) => <div key={index}><i style={{ height: `${value}%` }} /><small>{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][index]}</small></div>)}
      </div>
    </section>
  );
}

export function QuickActions() {
  return (
    <section className="home-panel actions-panel">
      <span className="eyebrow">БЫСТРЫЕ ДЕЙСТВИЯ</span>
      <div>
        <Link href="/quest"><span><Icon name="map" /></span><b>Открыть карту</b></Link>
        <NewNoteButton />
        <Link href="/rewards"><span><Icon name="trophy" /></span><b>Мои награды</b></Link>
      </div>
    </section>
  );
}

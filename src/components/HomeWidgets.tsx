import { Link } from 'wouter';
import { Icon } from './Icon';
import { NewNoteButton } from './NewNoteButton';
import type { AiQuestPlan } from '../lib/aiQuest';
import type { HomeProgress } from '../lib/homeProgress';

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

function dailyTip(goal: string | undefined, task: string | undefined, progress: HomeProgress) {
  const variant = Math.floor(Date.now() / 86_400_000) % 3;
  if (progress.completedToday > 0) return [
    `Отличный темп: сегодня выполнено заданий — ${progress.completedToday}. Запиши, что получилось лучше всего.`,
    `Сегодня уже готово ${progress.completedToday}. Сделай короткую паузу и выбери следующий небольшой шаг.`,
    `Ты продвинулась сегодня на ${progress.completedToday} заданий. Закрепи результат одной заметкой.`,
  ][variant];
  if (progress.streak > 0 && task) return [
    `Сохрани серию из ${progress.streak} дн.: начни «${task}» всего с 10 минут сосредоточенной работы.`,
    `Серия уже ${progress.streak} дн. Открой «${task}» и выполни сначала самый лёгкий пункт.`,
    `Не прерывай ритм: сегодня достаточно сделать один конкретный шаг в задании «${task}».`,
  ][variant];
  if (task) return [
    `Твой следующий шаг — «${task}». Сначала сделай самую маленькую понятную часть задания.`,
    `Начни «${task}» с результата, который можно получить за 15 минут.`,
    `Открой «${task}» и выбери один пункт, который реально закончить сегодня.`,
  ][variant];
  if (goal) return `Вернись к цели «${goal}» и выбери один результат, которого реально достичь сегодня.`;
  return 'Начни с одной важной цели — Кью поможет разбить её на небольшие шаги.';
}

export function AiTip({ goal, task, progress }: { goal?: string; task?: string; progress: HomeProgress }) {
  return (
    <section className="home-panel ai-tip">
      <img src="/goalquest-q-tip-star.png" alt="Фиолетовая звезда GoalQuest" />
      <div><span className="eyebrow">СОВЕТ ОТ КЬЮ</span><p>{dailyTip(goal, task, progress)}</p></div>
    </section>
  );
}

export function WeekProgress({ progress }: { progress: HomeProgress }) {
  const max = Math.max(...progress.weekCounts, 1);
  return (
    <section className="home-panel week-panel">
      <div className="section-heading"><div><span className="eyebrow">ТВОЙ РИТМ</span><h2>Недельный прогресс</h2></div>
        <span className="week-growth">{progress.growth === null ? 'Новая неделя' : `${progress.growth >= 0 ? '↗' : '↘'} ${Math.abs(progress.growth)}%`}</span></div>
      <div className="week-chart">
        {progress.weekCounts.map((value, index) => <div key={index} title={`${value} выполнено`}>
          <b>{value}</b><i style={{ height: value ? `${Math.max(18, value / max * 100)}%` : '4%' }} />
          <small>{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][index]}</small></div>)}
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

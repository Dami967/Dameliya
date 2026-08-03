import { useState } from 'react';
import { Link } from 'wouter';
import { Icon } from './Icon';
import { NewNoteButton } from './NewNoteButton';
import type { AiQuestPlan } from '../lib/aiQuest';
import type { HomeProgress } from '../lib/homeProgress';

export function TodayTasks({ plan }: { plan: AiQuestPlan | null }) {
  const activeIndex = plan?.steps.findIndex((step) => step.state === 'active') ?? -1;
  const groupStart = activeIndex >= 0 ? Math.floor(activeIndex / 3) * 3 : 0;
  const tasks = plan && activeIndex >= 0
    ? plan.steps.slice(groupStart, groupStart + 3)
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

const qFacts = [
  'Осьминоги имеют три сердца, а их кровь голубая из-за содержащей медь молекулы гемоцианина.',
  'Мозг лучше запоминает материал, когда повторения распределены по нескольким дням, а не сделаны за один раз.',
  'На Венере один оборот вокруг своей оси длится дольше, чем её год вокруг Солнца.',
  'Во время короткой прогулки внимание часто восстанавливается, поэтому после неё легче вернуться к сложной задаче.',
  'Пчёлы передают другим пчёлам направление к цветам с помощью особого танца.',
  'Небольшие цели легче начать: мозгу проще выполнить конкретное действие, чем неопределённое «заняться делом».',
  'Свет от Солнца добирается до Земли примерно за 8 минут 20 секунд.',
  'Сон помогает мозгу закреплять новые знания, полученные в течение дня.',
];

function factForThisVisit() {
  const previous = Number(sessionStorage.getItem('goalquest_last_fact'));
  const choices = qFacts.map((_, index) => index).filter((index) => index !== previous);
  const index = choices[Math.floor(Math.random() * choices.length)] ?? 0;
  sessionStorage.setItem('goalquest_last_fact', String(index));
  return qFacts[index];
}

export function AiTip(_props: { goal?: string; task?: string; progress: HomeProgress }) {
  const fact = useState(factForThisVisit)[0];
  return (
    <section className="home-panel ai-tip">
      <img src="/goalquest-q-tip-star.png" alt="Фиолетовая звезда GoalQuest" />
      <div><span className="eyebrow">ИНТЕРЕСНЫЙ ФАКТ ОТ КЬЮ</span><p>{fact}</p></div>
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

import { Link } from 'wouter';
import { Icon } from './Icon';

export function TodayTasks() {
  const tasks = [
    { title: 'Изучи 3 конкурентов', time: '25 мин', xp: 100, done: false },
    { title: 'Запиши главную гипотезу', time: '10 мин', xp: 40, done: true },
    { title: 'Ответь на мини-викторину', time: '5 мин', xp: 25, done: false },
  ];
  return (
    <section className="home-panel today-panel">
      <div className="section-heading"><div><span className="eyebrow">ПЛАН НА ДЕНЬ</span><h2>Задания на сегодня</h2></div><b className="tasks-count">1 / 3</b></div>
      <div className="today-list">
        {tasks.map((task) => (
          <Link href="/task" className={`today-task ${task.done ? 'is-done' : ''}`} key={task.title}>
            <span className="task-check">{task.done && <Icon name="check" size={14} />}</span>
            <div><b>{task.title}</b><small>{task.time} · +{task.xp} XP</small></div>
            <Icon name="arrow" size={15} />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AiTip() {
  return (
    <section className="home-panel ai-tip">
      <img src="/goalquest-eagle-quest.png" alt="Орлёнок Кью" />
      <div><span className="eyebrow">СОВЕТ ОТ КЬЮ</span><p>Не пытайся изучить весь рынок сразу. Начни с трёх проектов и ищи не недостатки, а возможности.</p></div>
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
        <Link href="/task"><span><Icon name="book" /></span><b>Добавить заметку</b></Link>
        <Link href="/profile"><span><Icon name="trophy" /></span><b>Мои награды</b></Link>
      </div>
    </section>
  );
}

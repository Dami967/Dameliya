import { useState } from 'react';
import { Link } from 'wouter';
import { Icon } from '../components/Icon';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { TaskMentor } from '../components/TaskMentor';

export function TaskPage() {
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const task = 'Изучи своих конкурентов: найди три похожих проекта и определи, чем твоя идея отличается.';
  return (
    <div className="task-page">
      <header className="task-topbar">
        <Link href="/quest" className="back-link">← <span>К карте</span></Link>
        <div className="task-topbar__progress"><span>Этап 2 из 10</span><div><i /></div></div>
        <span className="stat-chip stat-chip--xp"><Icon name="zap" size={18} />1 240 XP</span>
      </header>
      <main className="task-layout">
        <article className="task-main">
          <span className="task-label"><Icon name="sparkles" size={16} /> ТЕКУЩЕЕ ЗАДАНИЕ</span>
          <h1>Изучи своих конкурентов</h1>
          <p className="task-lead">Найди три похожих проекта и пойми, чем твоя идея сможет выделиться.</p>
          <div className="task-info">
            <span><Icon name="clock" size={18} />25 минут</span>
            <span><Icon name="zap" size={18} />+100 XP</span>
            <span><Icon name="target" size={18} />Исследование</span>
          </div>
          <section className="content-card">
            <h2>Что нужно сделать</h2>
            <ol className="steps-list">
              <li><span>1</span><p><b>Найди 3 похожих проекта</b><small>Поищи сервисы, которые решают похожую проблему.</small></p></li>
              <li><span>2</span><p><b>Изучи их сильные стороны</b><small>Что у них удобно? За что их любят пользователи?</small></p></li>
              <li><span>3</span><p><b>Найди свою суперсилу</b><small>Запиши, чем твой продукт будет лучше или по-другому.</small></p></li>
            </ol>
          </section>
          <section className="content-card">
            <h2>Мои заметки</h2>
            <textarea value={note} onChange={(event) => setNote(event.target.value)}
              placeholder="Записывай сюда идеи, ссылки и наблюдения..." />
            <small className="autosave">{note ? 'Сохранено локально' : 'Заметки сохраняются автоматически'}</small>
          </section>
          <button className={`complete-button ${done ? 'is-done' : ''}`} onClick={() => setDone(true)}>
            <Icon name="check" /> {done ? 'Задание выполнено! +100 XP' : 'Я выполнила задание'}
          </button>
        </article>
        <TaskMentor task={task} notes={note} />
      </main>
      {done && <CompletionCelebration onClose={() => setDone(false)} />}
    </div>
  );
}

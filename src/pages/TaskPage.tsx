import { useState } from 'react';
import { Link } from 'wouter';
import { Icon } from '../components/Icon';
import { CompletionCelebration } from '../components/CompletionCelebration';

export function TaskPage() {
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  return (
    <div className="task-page">
      <header className="task-topbar">
        <Link href="/" className="back-link">← <span>К карте</span></Link>
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
        <aside className="ai-panel">
          <div className="ai-panel__head"><span className="mentor-avatar">AI</span>
            <div><h3>Квест · AI-наставник</h3><small><i /> Всегда на связи</small></div></div>
          <div className="ai-chat">
            <div className="ai-bubble">Привет! Я помогу тебе с исследованием. Если застрянешь — просто напиши. Вместе найдём другой путь ✨</div>
            {message && <div className="user-bubble">{message}</div>}
          </div>
          <div className="quick-prompts">
            <button onClick={() => setMessage('Помоги найти конкурентов')}>Найти конкурентов</button>
            <button onClick={() => setMessage('Я застряла — предложи другой путь')}>Я застряла</button>
          </div>
          <form className="chat-form" onSubmit={(event) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem('chat') as HTMLInputElement; setMessage(input.value); input.value = ''; }}>
            <input name="chat" placeholder="Спроси наставника..." /><button aria-label="Отправить">↑</button>
          </form>
          <div className="ai-energy"><Icon name="zap" size={16} /><span>Это сообщение потратит ~2 Momentum</span><b>72</b></div>
        </aside>
      </main>
      {done && <CompletionCelebration onClose={() => setDone(false)} />}
    </div>
  );
}

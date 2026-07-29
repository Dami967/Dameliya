import { useState } from 'react';
import { Icon } from './Icon';

export function FloatingMentor() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <div className={`floating-mentor ${isOpen ? 'is-open' : ''}`}>
      {isOpen && (
        <section className="mentor-popover">
          <header>
            <img src="/goalquest-eagle-quest.png" alt="" />
            <div><b>Кью · AI Mentor</b><small><i /> Готов помочь</small></div>
            <button onClick={() => setIsOpen(false)} aria-label="Закрыть">×</button>
          </header>
          <div className="mentor-popover__chat">
            <p>Привет! Как идёт твоё приключение? Могу помочь сделать следующий шаг проще 🦅</p>
            {message && <p className="mentor-popover__answer">{message}</p>}
          </div>
          <div className="mentor-suggestions">
            <button onClick={() => setMessage('Давай разобьём задачу на три простых шага.')}>Я застряла</button>
            <button onClick={() => setMessage('Сегодня начни с 15 минут исследования — этого достаточно!')}>Что делать?</button>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem('mentor') as HTMLInputElement; if (input.value.trim()) setMessage(input.value); input.value = ''; }}>
            <input name="mentor" placeholder="Спроси Кью..." />
            <button aria-label="Отправить">↑</button>
          </form>
          <small className="mentor-cost"><Icon name="zap" size={13} /> Примерно 2 Momentum</small>
        </section>
      )}
      {!isOpen && <span className="mentor-hint">Спросить Кью</span>}
      <button className="mentor-fab" onClick={() => setIsOpen(!isOpen)} aria-label="Открыть AI Mentor">
        <img src="/goalquest-eagle-quest.png" alt="Кью, AI-наставник GoalQuest" />
        <span><Icon name={isOpen ? 'plus' : 'message'} size={17} /></span>
      </button>
    </div>
  );
}

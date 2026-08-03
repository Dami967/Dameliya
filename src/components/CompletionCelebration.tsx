import { Icon } from './Icon';

type CompletionCelebrationProps = {
  xp: number;
  streak: number;
  level: number;
  goal: string;
  onClose: () => void;
};

export function CompletionCelebration({ xp, streak, level, goal, onClose }: CompletionCelebrationProps) {
  return (
    <div className="celebration-backdrop" role="dialog" aria-modal="true" aria-label="Задание выполнено">
      <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
      <section className="celebration-card">
        <span className="celebration-rays" />
        <img src="/goalquest-eagle-quest.png" alt="Кью поздравляет тебя" />
        <span className="achievement-pop"><Icon name="trophy" size={23} /></span>
        <span className="eyebrow">ЗАДАНИЕ ВЫПОЛНЕНО</span>
        <h2>Отличная работа!</h2>
        <p>Ты стала на один шаг ближе к цели «{goal}».</p>
        <div className="reward-row">
          <div><Icon name="zap" /><b>+{xp} XP</b><small>Опыт</small></div>
          <div><Icon name="flame" /><b>{streak} дн.</b><small>Серия</small></div>
          <div><Icon name="star" /><b>Уровень {level}</b><small>Текущий уровень</small></div>
        </div>
        <button onClick={onClose}>Продолжить путь <Icon name="arrow" size={18} /></button>
      </section>
    </div>
  );
}

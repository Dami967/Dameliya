import { Icon } from './Icon';

type CompletionCelebrationProps = { onClose: () => void };

export function CompletionCelebration({ onClose }: CompletionCelebrationProps) {
  return (
    <div className="celebration-backdrop" role="dialog" aria-modal="true" aria-label="Задание выполнено">
      <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
      <section className="celebration-card">
        <span className="celebration-rays" />
        <img src="/goalquest-eagle-quest.png" alt="Кью поздравляет тебя" />
        <span className="achievement-pop"><Icon name="trophy" size={23} /></span>
        <span className="eyebrow">ЗАДАНИЕ ВЫПОЛНЕНО</span>
        <h2>Отличная работа!</h2>
        <p>Ты стала на один шаг ближе к запуску своего стартапа.</p>
        <div className="reward-row">
          <div><Icon name="zap" /><b>+100 XP</b><small>Опыт</small></div>
          <div><Icon name="flame" /><b>8 дней</b><small>Серия</small></div>
          <div><Icon name="star" /><b>Уровень 7</b><small>Повышение!</small></div>
        </div>
        <button onClick={onClose}>Продолжить путь <Icon name="arrow" size={18} /></button>
      </section>
    </div>
  );
}

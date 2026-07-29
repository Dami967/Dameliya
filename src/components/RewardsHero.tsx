import { Icon } from './Icon';

export function RewardsHero({ collected, total }: { collected: number; total: number }) {
  const percent = Math.round((collected / total) * 100);
  return (
    <section className="rewards-hero">
      <div className="rewards-hero__copy">
        <span className="eyebrow">ТВОЯ КОЛЛЕКЦИЯ</span>
        <h2>{percent}% мира GoalQuest уже твои</h2>
        <p>Продолжай выполнять реальные цели — каждое достижение открывает новую часть приключения.</p>
        <div className="collection-progress"><span style={{ width: `${percent}%` }} /></div>
        <small>{collected} из {total} предметов собрано</small>
      </div>
      <div className="hero-character">
        <span className="hero-character__spark">✦</span>
        <div className="hero-character__avatar">🧑‍🚀</div>
        <div className="hero-character__eagle"><img src="/goalquest-eagle.png" alt="Орлёнок Кью" /></div>
      </div>
      <div className="next-reward"><span>СЛЕДУЮЩАЯ НАГРАДА</span><b>Компас цели</b><small>Ещё 5 заданий</small>
        <div><Icon name="target" size={16} /><span><i style={{ width: '67%' }} /></span><b>10/15</b></div>
      </div>
    </section>
  );
}

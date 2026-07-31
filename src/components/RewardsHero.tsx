import { Icon } from './Icon';
import type { Reward } from '../lib/rewardsData';
import { DressedEagle } from './DressedEagle';

export function RewardsHero({ collected, total, equipped }: { collected: number; total: number; equipped: Reward[] }) {
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
        <DressedEagle equipped={equipped} />
      </div>
      <div className="next-reward"><span>СЛЕДУЮЩАЯ НАГРАДА</span><b>Компас цели</b><small>Ещё 5 заданий</small>
        <div><Icon name="target" size={16} /><span><i style={{ width: '67%' }} /></span><b>10/15</b></div>
      </div>
    </section>
  );
}

import { useEffect } from 'react';
import type { Reward } from '../lib/rewardsData';

export function NewRewardToast({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5500);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return <aside className={`new-reward-toast new-reward-toast--${reward.rarity}`}>
    <button onClick={onClose}>×</button><span className="reward-rays" />
    <div>{reward.icon}</div><section><small>✨ НОВАЯ НАГРАДА!</small><b>{reward.title}</b><p>Добавлена в твою коллекцию</p></section>
  </aside>;
}

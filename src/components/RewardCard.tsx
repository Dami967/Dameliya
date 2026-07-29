import { Icon } from './Icon';
import { rarityLabels, type Reward } from '../lib/rewardsData';

type Props = {
  reward: Reward;
  equipped: boolean;
  onSelect: (reward: Reward) => void;
};

export function RewardCard({ reward, equipped, onSelect }: Props) {
  return (
    <button className={`reward-card reward-card--${reward.rarity} ${!reward.unlocked ? 'is-locked' : ''}`}
      onClick={() => onSelect(reward)}>
      <span className="rarity-label">{rarityLabels[reward.rarity]}</span>
      <span className="reward-card__icon">{reward.icon}</span>
      <span className="reward-card__title">{reward.title}</span>
      {equipped && <span className="equipped-label"><Icon name="check" size={12} /> Надето</span>}
      {!reward.unlocked && <>
        <span className="reward-lock"><Icon name="lock" size={15} /></span>
        {reward.progress !== undefined && <span className="reward-mini-progress"><i style={{ width: `${reward.progress}%` }} /></span>}
      </>}
    </button>
  );
}

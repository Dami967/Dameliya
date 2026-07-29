import { Icon } from './Icon';
import { rarityLabels, type Reward } from '../lib/rewardsData';

type Props = {
  reward: Reward;
  equipped: boolean;
  saving: boolean;
  onEquip: () => void;
  onClose: () => void;
};

export function RewardDetails({ reward, equipped, saving, onEquip, onClose }: Props) {
  return (
    <div className="reward-dialog-backdrop" role="presentation" onClick={onClose}>
      <section className={`reward-dialog reward-dialog--${reward.rarity}`} role="dialog" aria-modal="true"
        aria-label={reward.title} onClick={(event) => event.stopPropagation()}>
        <button className="dialog-close" onClick={onClose} aria-label="Закрыть">×</button>
        <span className="reward-dialog__glow" />
        <span className="reward-dialog__icon">{reward.icon}</span>
        <span className="rarity-label">{rarityLabels[reward.rarity]}</span>
        <h2>{reward.title}</h2>
        <p>{reward.unlocked ? 'Предмет уже в твоей коллекции. Его можно сразу примерить на героя.' : reward.condition}</p>
        {!reward.unlocked && reward.progress !== undefined && <div className="dialog-progress">
          <span><i style={{ width: `${reward.progress}%` }} /></span><b>{reward.progress}%</b>
        </div>}
        {reward.unlocked ? <button className="primary-button" disabled={saving} onClick={onEquip}>
          <Icon name={equipped ? 'check' : 'sparkles'} size={17} />{saving ? 'Сохраняем…' : equipped ? 'Снять' : 'Примерить'}
        </button> : <div className="locked-hint"><Icon name="lock" size={17} /><span><b>Как открыть</b><small>{reward.condition}</small></span></div>}
      </section>
    </div>
  );
}

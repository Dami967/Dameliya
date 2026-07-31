import { useState } from 'react';
import type { ChallengeDraft } from '../lib/collaborationData';
import { challengeLabels } from '../lib/collaborationData';
import type { SocialUser } from '../lib/socialData';
import { SocialAvatar } from './SocialAvatar';

export function ChallengeModal({ friends, onClose, onCreate, mysteryPrize = false }: {
  friends: SocialUser[]; onClose: () => void; onCreate: (challenge: ChallengeDraft) => void; mysteryPrize?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="social-modal creation-modal challenge-form" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onCreate({ title: form.get('title')?.toString() || challengeLabels[form.get('type') as ChallengeDraft['type']], participantIds: selected, type: form.get('type') as ChallengeDraft['type'], startsAt: form.get('startsAt')?.toString() ?? '', endsAt: form.get('endsAt')?.toString() ?? '', reward: mysteryPrize ? 'Таинственный сундук' : form.get('reward')?.toString().trim() ?? '' });
  }}>
    <button type="button" className="modal-close" onClick={onClose}>×</button>
    <header><span>🏁</span><div><h2>Дружеский челлендж</h2><p>Маленькое соревнование — большая мотивация</p></div></header>
    <div className="form-field"><span>Выбери друзей</span><div className="friend-picker">{friends.map((friend) => <button type="button" key={friend.id} className={selected.includes(friend.id) ? 'is-selected' : ''} onClick={() => setSelected((old) => old.includes(friend.id) ? old.filter((id) => id !== friend.id) : [...old, friend.id])}><SocialAvatar user={friend} size="small" /><b>{friend.name}</b><i>✓</i></button>)}</div></div>
    <label><span>Тип челленджа</span><select name="type">{Object.entries(challengeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label><span>Название</span><input name="title" maxLength={80} placeholder="Например, Рывок недели" /></label>
    <div className="date-fields"><label><span>Начало</span><input name="startsAt" type="date" min={tomorrow} defaultValue={tomorrow} required /></label><label><span>Окончание</span><input name="endsAt" type="date" min={tomorrow} defaultValue={nextWeek} required /></label></div>
    {mysteryPrize ? <div className="mystery-prize-field">🎁 <span><b>Таинственный сундук</b><small>Содержимое выпадет случайно после победы</small></span></div>
      : <label><span>Награда победителю</span><input name="reward" required placeholder="🏆 Особая медаль или игровой подарок" /></label>}
    <button disabled={!selected.length} className="social-primary submit-creation">Отправить приглашение · {selected.length}</button>
  </form></div>;
}

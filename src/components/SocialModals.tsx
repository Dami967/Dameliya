import type { SocialUser } from '../lib/socialData';
import { Icon } from './Icon';
import { SocialAvatar } from './SocialAvatar';

export function UserProfileModal({ user, onClose, onChat }: { user: SocialUser; onClose: () => void; onChat: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="social-modal profile-modal" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose}>×</button>
    <div className="profile-cover"><SocialAvatar user={user} size="large" /><h2>{user.name}</h2><p>@{user.username}</p><div><span>⭐ Уровень {user.level}</span><span>⚡ {user.xp} XP</span><span>🔥 {user.streak} дней</span></div></div>
    <div className="public-goal"><small>ГЛАВНАЯ ЦЕЛЬ</small><b>{user.goal}</b><span><i style={{ width: '68%' }} /></span><p>68% пройдено</p></div>
    <div className="collection-grid"><span>🦅<b>Орлёнок Искра</b></span><span>🥋<b>Костюм исследователя</b></span><span>🏅<b>Медаль «Вперёд»</b></span><span>🧩<b>Коллекция 72%</b></span></div>
    <div className="recent-award"><span>🏆</span><div><small>ПОСЛЕДНЕЕ ДОСТИЖЕНИЕ</small><b>Серия продуктивности · 7 дней</b></div></div>
    <button className="social-primary profile-chat" onClick={onChat}><Icon name="message" size={18} /> Написать сообщение</button>
  </section></div>;
}

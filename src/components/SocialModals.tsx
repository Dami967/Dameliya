import type { SocialUser } from '../lib/socialData';
import { Icon } from './Icon';
import { SocialAvatar } from './SocialAvatar';

export function UserProfileModal({ user, onClose, onChat }: { user: SocialUser; onClose: () => void; onChat?: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="social-modal profile-modal" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose}>×</button>
    <div className="profile-cover"><SocialAvatar user={user} size="large" /><h2>{user.name}</h2><p>@{user.username}</p><div><span>⭐ Уровень {user.level}</span><span>⚡ {user.xp} XP</span><span>🔥 {user.streak} дней</span></div></div>
    <div className="public-goal"><small>ГЛАВНАЯ ЦЕЛЬ</small><b>{user.goal}</b></div>
    {!!user.interests.length && <div className="interest-tags">{user.interests.map((interest) =>
      <span key={interest}>{interest}</span>)}</div>}
    {onChat ? <button className="social-primary profile-chat" onClick={onChat}><Icon name="message" size={18} /> Написать сообщение</button>
      : <p>Общаться можно после того, как вы добавите друг друга в друзья.</p>}
  </section></div>;
}

import { Icon } from './Icon';
import { SocialAvatar } from './SocialAvatar';
import type { SocialUser } from '../lib/socialData';

type Props = {
  user: SocialUser;
  onOpen: (user: SocialUser) => void;
  onChat: (user: SocialUser) => void;
  onPin: (id: string) => void;
};

export function FriendCard({ user, onOpen, onChat, onPin }: Props) {
  return (
    <article className={`friend-card ${user.pinned ? 'is-pinned' : ''}`}>
      {user.pinned && <span className="pin-label"><Icon name="pin" size={13} /> Лучший друг</span>}
      <button className="friend-person" onClick={() => onOpen(user)}>
        <SocialAvatar user={user} />
        <span><b>{user.name}</b><small>@{user.username}</small></span>
      </button>
      <div className="friend-stats">
        <span><b>{user.level}</b> уровень</span>
        <span><b>{user.xp}</b> XP</span>
        <span><b>🔥 {user.streak}</b> дней</span>
      </div>
      <div className="friend-actions">
        <button className="social-primary" onClick={() => onChat(user)}><Icon name="message" size={17} /> Написать</button>
        <button className="social-icon-button" onClick={() => onPin(user.id)} aria-label="Закрепить"><Icon name="pin" size={17} /></button>
      </div>
    </article>
  );
}

import type { SocialUser } from '../lib/socialData';

export function SocialAvatar({ user, size = 'normal' }: { user: SocialUser; size?: 'small' | 'normal' | 'large' }) {
  return (
    <span className={`social-avatar social-avatar--${size}`}>
      {user.avatar}
      <i className={user.online ? 'is-online' : ''} />
    </span>
  );
}

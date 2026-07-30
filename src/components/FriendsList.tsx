import type { SocialUser } from '../lib/socialData';
import { FriendCard } from './FriendCard';

type Props = {
  friends: SocialUser[];
  onOpen: (user: SocialUser) => void;
  onChat: (user: SocialUser) => void;
  onPin: (id: string) => void;
  onChallenge: () => void;
};

export function FriendsList({ friends, onOpen, onChat, onPin, onChallenge }: Props) {
  const sorted = [...friends].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  return (
    <section className="friends-list">
      <div className="panel-title"><div><h2>Твои друзья</h2><p>{friends.length} человека рядом на пути к целям</p></div>
        <button className="social-outline" onClick={onChallenge}>Пригласить в челлендж</button>
      </div>
      <div className="friend-grid">
        {sorted.map((friend) => <FriendCard key={friend.id} user={friend} onOpen={onOpen} onChat={onChat} onPin={onPin} />)}
      </div>
    </section>
  );
}

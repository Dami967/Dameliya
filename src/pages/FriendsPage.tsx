import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AppShell } from '../components/AppShell';
import { ActivityFeed } from '../components/ActivityFeed';
import { FriendsList } from '../components/FriendsList';
import { PeopleSearch } from '../components/PeopleSearch';
import { UserProfileModal } from '../components/SocialModals';
import { ChatModal } from '../components/ChatModal';
import type { SocialUser } from '../lib/socialData';
import { cachedMutualFriends, loadMutualFriends, subscribeToFriendships } from '../lib/friends';
import { useSession } from '../lib/useSession';
import { FriendInviteModal } from '../components/FriendInviteModal';

type Tab = 'friends' | 'activity' | 'search';
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'friends', label: 'Друзья', icon: '👥' },
  { id: 'activity', label: 'Активность', icon: '🌍' },
  { id: 'search', label: 'Поиск', icon: '🔍' },
];

export function FriendsPage() {
  const { session } = useSession();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<SocialUser[]>(() => cachedMutualFriends());
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [profile, setProfile] = useState<SocialUser | null>(null);
  const [chat, setChat] = useState<SocialUser | null>(null);
  const [inviteModal, setInviteModal] = useState(false);
  const [, navigate] = useLocation();
  const refreshFriends = useCallback(async () => {
    if (!session) return;
    const cached = cachedMutualFriends(session.user.id);
    if (cached.length) setFriends(cached);
    const mutual = await loadMutualFriends(session.user.id);
    setFriends(mutual);
    setFriendsLoading(false);
  }, [session]);
  useEffect(() => {
    if (!session) return;
    void refreshFriends();
    const channel = subscribeToFriendships(session.user.id, () => void refreshFriends());
    return () => { void channel.unsubscribe(); };
  }, [session, refreshFriends]);
  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get('chat');
    if (!requestedId || chat) return;
    const requestedFriend = friends.find((friend) => friend.id === requestedId);
    if (requestedFriend) {
      setProfile(null); setChat(requestedFriend);
      navigate('/friends', { replace: true });
    }
  }, [chat, friends, navigate]);
  const openChat = (user: SocialUser) => { setProfile(null); setChat(user); };
  return <AppShell>
    <div className="friends-page">
      <header className="friends-header"><div><span className="eyebrow">ВМЕСТЕ ЛЕГЧЕ</span><h1>Друзья</h1><p>Поддерживайте друг друга и достигайте большего вместе.</p></div>
        <div className="friends-header-actions"><div className="friends-summary"><span>👥 <b>{friends.length}</b> друзей</span><span>🔥 <b>{friends.filter((friend) => friend.online).length}</b> сейчас онлайн</span></div>
          <button className="social-primary" onClick={() => setInviteModal(true)}>▦ Добавить друга</button></div>
      </header>
      <nav className="friends-tabs" aria-label="Разделы страницы">
        {tabs.map((item) => <button key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}
      </nav>
      <div className="friends-panel" key={tab}>
        {tab === 'friends' && friendsLoading && !friends.length
          ? <div className="center-loader">Загружаем друзей…</div>
          : tab === 'friends' && <FriendsList friends={friends} onOpen={setProfile} onChat={openChat}
          onChallenge={() => navigate('/rewards?section=competitions&new=1')}
          onPin={(id) => setFriends((old) => old.map((friend) => ({ ...friend, pinned: friend.id === id ? !friend.pinned : false })))} />}
        {tab === 'activity' && <ActivityFeed friends={friends} />}
        {tab === 'search' && <PeopleSearch onOpen={setProfile} onFriendsChanged={() => void refreshFriends()} />}
      </div>
    </div>
    {profile && <UserProfileModal user={profile} onClose={() => setProfile(null)}
      onChat={friends.some((friend) => friend.id === profile.id) ? () => openChat(profile) : undefined} />}
    {chat && session && <ChatModal user={chat} currentUserId={session.user.id} friends={friends} onClose={() => setChat(null)} />}
    {inviteModal && session && <FriendInviteModal userId={session.user.id} onClose={() => setInviteModal(false)}
      onScanned={(token) => { setInviteModal(false); navigate(`/friends/invite/${token}`); }} />}
  </AppShell>;
}

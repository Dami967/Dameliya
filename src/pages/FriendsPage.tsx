import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AppShell } from '../components/AppShell';
import { ActivityFeed } from '../components/ActivityFeed';
import { FriendsList } from '../components/FriendsList';
import { PeopleSearch } from '../components/PeopleSearch';
import { UserProfileModal } from '../components/SocialModals';
import { ChatModal } from '../components/ChatModal';
import { TeamsPanel } from '../components/TeamsPanel';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { ChallengeModal } from '../components/ChallengeModal';
import { ChallengeDashboard } from '../components/ChallengeDashboard';
import { socialUsers, type SocialUser } from '../lib/socialData';
import type { ChallengeDraft, CreatedChallenge, CreatedTeam, TeamDraft } from '../lib/collaborationData';
import { loadMutualFriends, subscribeToFriendships } from '../lib/friends';
import { useSession } from '../lib/useSession';
import { createStoredTeam, deleteStoredTeam, loadStoredTeams } from '../lib/teamRepository';
import { FriendInviteModal } from '../components/FriendInviteModal';

type Tab = 'friends' | 'activity' | 'teams' | 'search';
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'friends', label: 'Друзья', icon: '👥' },
  { id: 'activity', label: 'Активность', icon: '🌍' },
  { id: 'teams', label: 'Команды', icon: '👥' },
  { id: 'search', label: 'Поиск', icon: '🔍' },
];

export function FriendsPage() {
  const { session } = useSession();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState(socialUsers);
  const [profile, setProfile] = useState<SocialUser | null>(null);
  const [chat, setChat] = useState<SocialUser | null>(null);
  const [teamModal, setTeamModal] = useState(false);
  const [challengeModal, setChallengeModal] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<CreatedTeam | null>(null);
  const [challenge, setChallenge] = useState<CreatedChallenge | null>(null);
  const [inviteModal, setInviteModal] = useState(false);
  const [, navigate] = useLocation();
  const refreshFriends = useCallback(async () => {
    if (!session) return;
    const mutual = await loadMutualFriends(session.user.id);
    setFriends([...socialUsers, ...mutual.filter((friend) => !socialUsers.some((demo) => demo.id === friend.id))]);
  }, [session]);
  useEffect(() => {
    if (!session) return;
    void refreshFriends();
    const channel = subscribeToFriendships(session.user.id, () => void refreshFriends());
    return () => { void channel.unsubscribe(); };
  }, [session, refreshFriends]);
  useEffect(() => {
    if (!session) return;
    void loadStoredTeams(session.user.id).then(({ data }) => {
      if (data[0]) setCreatedTeam(data[0]);
    });
  }, [session]);
  const openChat = (user: SocialUser) => { setProfile(null); setChat(user); };
  const currentUser: SocialUser = { id: session?.user.id ?? 'me', name: 'Дамелия', username: 'dameliya', avatar: 'Д', level: 6, xp: 1420, streak: 8, online: true, interests: [], goal: 'Достичь своей цели' };
  const createTeam = async (draft: TeamDraft) => {
    if (!session) return;
    const { data } = await createStoredTeam(session.user.id, draft);
    if (data) setCreatedTeam(data);
    setTeamModal(false);
    setTab('teams');
  };
  const createChallenge = (draft: ChallengeDraft) => {
    setChallenge({ ...draft, id: crypto.randomUUID(), participants: [currentUser, ...friends.filter((friend) => draft.participantIds.includes(friend.id))], status: 'active' });
    setChallengeModal(false);
  };
  return <AppShell>
    <div className="friends-page">
      <header className="friends-header"><div><span className="eyebrow">ВМЕСТЕ ЛЕГЧЕ</span><h1>Друзья</h1><p>Поддерживайте друг друга и достигайте большего вместе.</p></div>
        <div className="friends-header-actions"><div className="friends-summary"><span>👥 <b>{friends.length}</b> друзей</span><span>🔥 <b>6</b> активны сегодня</span></div>
          <button className="social-primary" onClick={() => setInviteModal(true)}>▦ Добавить друга</button></div>
      </header>
      <nav className="friends-tabs" aria-label="Разделы страницы">
        {tabs.map((item) => <button key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}
      </nav>
      <div className="friends-panel" key={tab}>
        {tab === 'friends' && <><FriendsList friends={friends} onOpen={setProfile} onChat={openChat} onChallenge={() => setChallengeModal(true)} onPin={(id) => setFriends((old) => old.map((friend) => ({ ...friend, pinned: friend.id === id ? !friend.pinned : false })))} />{challenge && <ChallengeDashboard challenge={challenge} />}</>}
        {tab === 'activity' && <ActivityFeed />}
        {tab === 'teams' && <TeamsPanel key={createdTeam?.id ?? 'teams'} createdTeam={createdTeam}
          userId={session?.user.id ?? ''} onCreate={() => setTeamModal(true)} onDelete={() => {
            if (createdTeam) void deleteStoredTeam(createdTeam.id);
            setCreatedTeam(null);
          }} />}
        {tab === 'search' && <PeopleSearch onOpen={setProfile} />}
      </div>
    </div>
    {profile && <UserProfileModal user={profile} onClose={() => setProfile(null)} onChat={() => openChat(profile)} />}
    {chat && <ChatModal user={chat} onClose={() => setChat(null)} />}
    {teamModal && <CreateTeamModal onClose={() => setTeamModal(false)} onCreate={createTeam} />}
    {challengeModal && <ChallengeModal friends={friends} onClose={() => setChallengeModal(false)} onCreate={createChallenge} />}
    {inviteModal && session && <FriendInviteModal userId={session.user.id} onClose={() => setInviteModal(false)}
      onScanned={(token) => { setInviteModal(false); navigate(`/friends/invite/${token}`); }} />}
  </AppShell>;
}

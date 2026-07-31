import { useCallback, useEffect, useState } from 'react';
import { cancelCompetition, createCompetition, finishCompetition, loadCompetitions, answerCompetition,
  type Competition } from '../lib/competitions';
import type { ChallengeDraft } from '../lib/collaborationData';
import { loadMutualFriends } from '../lib/friends';
import type { SocialUser } from '../lib/socialData';
import { useSession } from '../lib/useSession';
import { ChallengeModal } from './ChallengeModal';
import { Icon } from './Icon';
import { ChallengeCountdown } from './ChallengeCountdown';
import { CompetitionInvitation } from './CompetitionInvitation';

export function CompetitionsPanel() {
  const { session } = useSession();
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [items, setItems] = useState<Competition[]>([]);
  const [showModal, setShowModal] = useState(
    () => new URLSearchParams(window.location.search).get('new') === '1',
  );
  const refresh = useCallback(async () => {
    if (!session) return;
    const [people, competitions] = await Promise.all([loadMutualFriends(session.user.id), loadCompetitions()]);
    setFriends(people); setItems(competitions.data ?? []);
  }, [session]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function create(draft: ChallengeDraft) {
    if (!session) return null;
    const result = await createCompetition(session.user.id, { ...draft, reward: 'Случайный приз' });
    await refresh(); return result.error ? null : result.data?.id ?? null;
  }
  const invitations = items.filter((competition) => competition.challenge_participants.some((item) =>
    item.user_id === session?.user.id && item.invitation_status === 'pending'));
  const active = items.find((competition) => competition.challenge_participants.some((item) =>
    item.user_id === session?.user.id && item.invitation_status === 'accepted')) ?? null;
  const canCancel = Boolean(active && active.creator_id === session?.user.id
    && Date.now() - new Date(active.created_at).getTime() <= 86400000);

  return <div className="competitions-layout">
    <section className="competition-main">
      <header><div><span className="live-dot">{active ? statusLabel(active.status) : 'Пока тихо'}</span>
        <h2>{active?.title || 'Создай первое соревнование'}</h2>
        <p>{active ? 'Выполняйте задания и зарабатывайте очки.' : 'Позови настоящего друга и устрой дружеский вызов.'}</p>
      </div>{canCancel && <button className="cancel-challenge" aria-label="Отменить челлендж"
        onClick={() => window.confirm('Отменить этот челлендж?') && void cancelCompetition(active!.id).then(refresh)}>×</button>}
        <span className="competition-cup">🏆</span></header>
      {active && active.status !== 'finished' && <ChallengeCountdown endsAt={active.ends_at} />}
      {active ? <div className="leaderboard">{[...active.challenge_participants].sort((a, b) => b.score - a.score)
        .map((person, index) => <div className={person.user_id === session?.user.id ? 'is-current' : ''} key={person.user_id}>
          <b className="place">#{index + 1}</b><span className="friend-avatar">{person.user_id === session?.user.id ? 'Я' : 'Д'}</span>
          <span className="friend-name"><b>{person.user_id === session?.user.id ? 'Ты' : friendName(friends, person.user_id)}</b>
            <i><em style={{ width: `${Math.min(100, person.score / 10)}%` }} /></i></span><strong>{person.score} XP</strong>
        </div>)}</div> : <div className="competition-empty">Здесь появится рейтинг участников.</div>}
      {invitations.map((competition) => <CompetitionInvitation key={competition.id} competition={competition}
        inviter={friendName(friends, competition.creator_id)}
        onAccept={() => void answerCompetition(competition.id, session!.user.id, true).then(refresh)}
        onDecline={() => void answerCompetition(competition.id, session!.user.id, false).then(refresh)} />)}
      {active && active.status !== 'finished' && new Date(active.ends_at) <= new Date() &&
        <button className="open-prize" onClick={() => void finishCompetition(active.id).then(refresh)}>Определить победителя</button>}
    </section>
    <aside className="competition-side">
      <section className="prize-card"><span className="eyebrow">ПРИЗ ПОБЕДИТЕЛЮ</span><div>🎁</div>
        <h3>{active?.prize_result || 'Сюрприз после финиша'}</h3>
        <p>{active?.prize_result ? 'Награда уже выдана победителю!' : 'Случайный приз откроется только после завершения вызова.'}</p></section>
      <section className="challenge-card"><div className="section-heading"><h2>Новый вызов</h2>
        <button className="challenge-plus" aria-label="Выбрать взаимных друзей" onClick={() => setShowModal(true)}>
          <Icon name="plus" size={17} /></button></div>
        <p>Позови друга и получайте очки за выполненные задания.</p>
        <button className="secondary-button" onClick={() => setShowModal(true)}>Выбрать друзей</button></section>
    </aside>
    {showModal && <ChallengeModal mysteryPrize friends={friends} onClose={() => setShowModal(false)}
      onCreate={create} />}
  </div>;
}

function friendName(friends: SocialUser[], id: string) {
  return friends.find((friend) => friend.id === id)?.name || 'Друг';
}
function statusLabel(status: Competition['status']) {
  return status === 'active' ? 'Идёт сейчас' : status === 'finished' ? 'Завершено' : 'Ждём ответа';
}

import { useCallback, useEffect, useState } from 'react';
import { createCompetition, finishCompetition, loadCompetitions, answerCompetition,
  type Competition } from '../lib/competitions';
import type { ChallengeDraft } from '../lib/collaborationData';
import { loadMutualFriends } from '../lib/friends';
import type { SocialUser } from '../lib/socialData';
import { useSession } from '../lib/useSession';
import { ChallengeModal } from './ChallengeModal';
import { Icon } from './Icon';

export function CompetitionsPanel() {
  const { session } = useSession();
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [items, setItems] = useState<Competition[]>([]);
  const [showModal, setShowModal] = useState(false);
  const refresh = useCallback(async () => {
    if (!session) return;
    const [people, competitions] = await Promise.all([loadMutualFriends(session.user.id), loadCompetitions()]);
    setFriends(people); setItems(competitions.data ?? []);
  }, [session]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function create(draft: ChallengeDraft) {
    if (!session) return;
    await createCompetition(session.user.id, { ...draft, reward: 'Таинственный сундук' });
    setShowModal(false); await refresh();
  }
  const active = items[0];
  const invitation = active?.challenge_participants.find((item) =>
    item.user_id === session?.user.id && item.invitation_status === 'pending');

  return <div className="competitions-layout">
    <section className="competition-main">
      <header><div><span className="live-dot">{active ? statusLabel(active.status) : 'Пока тихо'}</span>
        <h2>{active?.title || 'Создай первое соревнование'}</h2>
        <p>{active ? 'Выполняйте задания и зарабатывайте очки.' : 'Позови настоящего друга и устрой дружеский вызов.'}</p>
      </div><span className="competition-cup">🏆</span></header>
      {active ? <div className="leaderboard">{[...active.challenge_participants].sort((a, b) => b.score - a.score)
        .map((person, index) => <div className={person.user_id === session?.user.id ? 'is-current' : ''} key={person.user_id}>
          <b className="place">#{index + 1}</b><span className="friend-avatar">{person.user_id === session?.user.id ? 'Я' : 'Д'}</span>
          <span className="friend-name"><b>{person.user_id === session?.user.id ? 'Ты' : friendName(friends, person.user_id)}</b>
            <i><em style={{ width: `${Math.min(100, person.score / 10)}%` }} /></i></span><strong>{person.score} XP</strong>
        </div>)}</div> : <div className="competition-empty">Здесь появится рейтинг участников.</div>}
      {invitation && <div className="competition-answer"><b>Тебя пригласили!</b>
        <button onClick={() => void answerCompetition(active.id, session!.user.id, true).then(refresh)}>Принять</button>
        <button onClick={() => void answerCompetition(active.id, session!.user.id, false).then(refresh)}>Отклонить</button></div>}
      {active?.status !== 'finished' && new Date(active?.ends_at ?? 0) <= new Date() &&
        <button className="open-prize" onClick={() => void finishCompetition(active.id).then(refresh)}>Определить победителя</button>}
    </section>
    <aside className="competition-side">
      <section className="prize-card"><span className="eyebrow">ПРИЗ ПОБЕДИТЕЛЮ</span><div>🎁</div>
        <h3>{active?.prize_result || 'Таинственный сундук'}</h3>
        <p>{active?.prize_result ? 'Сундук открыт!' : 'Внутри может быть костюм, аксессуар, рамка или дополнительная энергия.'}</p></section>
      <section className="challenge-card"><div className="section-heading"><h2>Новый вызов</h2><Icon name="plus" size={17} /></div>
        <p>Позови друга и получайте очки за выполненные задания.</p>
        <button className="secondary-button" disabled={!friends.length} onClick={() => setShowModal(true)}>
          {friends.length ? 'Создать соревнование' : 'Сначала добавь друга'}</button></section>
    </aside>
    {showModal && <ChallengeModal mysteryPrize friends={friends} onClose={() => setShowModal(false)}
      onCreate={(draft) => void create(draft)} />}
  </div>;
}

function friendName(friends: SocialUser[], id: string) {
  return friends.find((friend) => friend.id === id)?.name || 'Друг';
}
function statusLabel(status: Competition['status']) {
  return status === 'active' ? 'Идёт сейчас' : status === 'finished' ? 'Завершено' : 'Ждём ответа';
}

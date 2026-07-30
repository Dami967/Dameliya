import type { CreatedChallenge } from '../lib/collaborationData';
import { challengeLabels } from '../lib/collaborationData';
import { SocialAvatar } from './SocialAvatar';

export function ChallengeDashboard({ challenge }: { challenge: CreatedChallenge }) {
  const days = Math.max(0, Math.ceil((new Date(challenge.endsAt).getTime() - Date.now()) / 86400000));
  return <article className="challenge-dashboard">
    <header><div><span>🏁 АКТИВНЫЙ ЧЕЛЛЕНДЖ</span><h3>{challenge.title}</h3><p>{challengeLabels[challenge.type]} · осталось {days} дней</p></div><i>⏱ {days}д</i></header>
    <div className="challenge-progress"><span style={{ width: '42%' }} /></div>
    <div className="challenge-ranking">{challenge.participants.map((person, index) => <div key={person.id}><b>#{index + 1}</b><SocialAvatar user={person} size="small" /><span><strong>{person.name}</strong><small>{index ? 'Приглашение отправлено' : 'Участник'}</small></span><em>{Math.max(120, 420 - index * 105)} XP</em></div>)}</div>
    <footer><span>🎁 Награда: <b>{challenge.reward}</b></span><button className="social-outline">Поделиться прогрессом</button></footer>
  </article>;
}

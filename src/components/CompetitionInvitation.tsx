import { challengeLabels } from '../lib/collaborationData';
import type { Competition } from '../lib/competitions';

export function CompetitionInvitation({ competition, inviter, onAccept, onDecline }: {
  competition: Competition; inviter: string; onAccept: () => void; onDecline: () => void;
}) {
  const days = Math.max(1, Math.ceil(
    (new Date(competition.ends_at).getTime() - new Date(competition.starts_at).getTime()) / 86400000,
  ));
  const type = competition.type as keyof typeof challengeLabels;
  return <article className="competition-invitation">
    <span className="eyebrow">ТЕБЯ ПРИГЛАСИЛИ</span>
    <h3>{inviter} зовёт в «{competition.title}»</h3>
    <div><span>⏱ <b>{days} дней</b></span><span>🎯 <b>{challengeLabels[type] ?? 'Задания квеста'}</b></span></div>
    <p>{taskExplanation(competition.type)}</p>
    <footer><button className="accept-invite" onClick={onAccept}>Принять</button>
      <button className="decline-invite" onClick={onDecline}>Отклонить</button></footer>
  </article>;
}

function taskExplanation(type: string) {
  if (type === 'xp') return 'Выполняйте свои задания квеста. Побеждает участник, который заработает больше XP.';
  if (type === 'tasks') return 'Засчитываются завершённые задания из личных квестов.';
  if (type === 'streak') return 'Каждый день выполняйте хотя бы одно задание и сохраняйте непрерывную серию.';
  if (type === 'goal') return 'Продвигайтесь по этапам своей выбранной цели до окончания челленджа.';
  return 'Выполняйте задания квеста и набирайте очки в общем рейтинге.';
}

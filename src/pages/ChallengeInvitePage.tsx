import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { challengeLabels, type ChallengeDraft } from '../lib/collaborationData';
import { acceptCompetitionInvite, loadCompetitionInvite, readCompetitionInviteToken,
  type CompetitionInviteDetails } from '../lib/competitions';
import { useSession } from '../lib/useSession';

export function ChallengeInvitePage({ params }: { params: { token: string } }) {
  const { session, loading } = useSession();
  const [, navigate] = useLocation();
  const [details, setDetails] = useState<CompetitionInviteDetails | null>(null);
  const [message, setMessage] = useState('Загружаем приглашение…');
  const token = readCompetitionInviteToken(params.token);

  useEffect(() => {
    if (!token) return setMessage('Ссылка приглашения повреждена.');
    void loadCompetitionInvite(token).then(({ data }) => {
      setDetails(data); setMessage(data ? '' : 'Ссылка закончилась или челлендж уже завершён.');
    });
  }, [token]);
  useEffect(() => {
    if (!loading && !session && token) sessionStorage.setItem('goalquest_after_auth', `/challenges/invite/${token}`);
  }, [loading, session, token]);

  async function accept() {
    const result = await acceptCompetitionInvite(token);
    if (result.error) return setMessage(inviteError(result.error.message));
    setMessage('Ты участвуешь в челлендже! 🏁');
    window.setTimeout(() => navigate('/rewards?section=competitions'), 900);
  }

  const type = details?.challenge_type as ChallengeDraft['type'] | undefined;
  const days = details ? Math.max(1, Math.ceil(
    (new Date(details.ends_at).getTime() - new Date(details.starts_at).getTime()) / 86400000,
  )) : 0;
  return <main className="invite-landing"><section><span className="invite-eagle">🏁</span>
    <span className="eyebrow">ДРУЖЕСКИЙ ЧЕЛЛЕНДЖ</span><h1>{details?.title || 'Приглашение в челлендж'}</h1>
    {details && <><p><b>{details.inviter_name}</b> приглашает тебя соревноваться.</p>
      <div className="challenge-invite-details"><span>⏱ {days} дней</span>
        <span>🎯 {type ? challengeLabels[type] : 'Задания квеста'}</span>
        <span>👥 {details.participant_count} из 6 участников</span></div></>}
    {!session ? <Link href="/auth" className="social-primary">Войти или зарегистрироваться</Link>
      : details && <div className="challenge-answer-actions"><button className="social-primary" onClick={() => void accept()}>Принять</button>
        <button className="social-outline" onClick={() => navigate('/home')}>Отклонить</button></div>}
    {message && <p className="invite-result">{message}</p>}
    <Link href="/home" className="invite-home">На главную</Link>
  </section></main>;
}

function inviteError(message: string) {
  if (message.includes('full')) return 'В челлендже уже участвуют пять приглашённых друзей.';
  if (message.includes('yourself')) return 'Это твой челлендж — приглашение нужно отправить другу.';
  if (message.includes('expired')) return 'Срок ссылки закончился. Попроси создать новую.';
  return 'Не удалось принять приглашение.';
}

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { acceptFriendInvite, readInviteToken } from '../lib/friendInvites';
import { useSession } from '../lib/useSession';

export function FriendInvitePage({ params }: { params: { token: string } }) {
  const { session, loading } = useSession();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState('');
  const token = readInviteToken(params.token);

  useEffect(() => {
    if (!loading && !session && token) sessionStorage.setItem('goalquest_after_auth', `/friends/invite/${token}`);
  }, [loading, session, token]);

  async function accept() {
    if (!token) return setMessage('Ссылка приглашения повреждена.');
    const { data, error } = await acceptFriendInvite(token);
    if (error) return setMessage(translateInviteError(error.message));
    setMessage(`Готово! ${data.inviter_name} теперь у тебя в друзьях ✨`);
    window.setTimeout(() => navigate('/friends'), 1200);
  }

  if (loading) return <main className="center-loader">Проверяем приглашение…</main>;
  return <main className="invite-landing"><section>
    <span className="invite-eagle">🦅</span><span className="eyebrow">GOALQUEST</span>
    <h1>Тебя приглашают в друзья</h1>
    <p>Подтверди приглашение, чтобы поддерживать друг друга и проходить квесты вместе.</p>
    {!session ? <Link href="/auth" className="social-primary">Войти или зарегистрироваться</Link>
      : <button className="social-primary" onClick={() => void accept()}>Принять приглашение</button>}
    {message && <p className="invite-result">{message}</p>}
    <Link href="/" className="invite-home">На главную</Link>
  </section></main>;
}

function translateInviteError(message: string) {
  if (message.includes('expired')) return 'Срок ссылки закончился. Попроси друга создать новую.';
  if (message.includes('already')) return 'Эта ссылка уже была использована.';
  if (message.includes('yourself')) return 'Это твой QR-код — покажи его другому человеку.';
  return 'Не удалось принять приглашение. Попроси друга создать новую ссылку.';
}

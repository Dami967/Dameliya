import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { supabase } from '../lib/supabase';
import { getAuthDestination } from '../lib/authDestination';

export function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const [message, setMessage] = useState('Завершаем вход через Google…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function finishGoogleSignIn() {
      try {
        const params = new URLSearchParams(window.location.search);
        const returnedError = params.get('error_description') || params.get('error');
        if (returnedError) throw new Error(returnedError);

        let { data, error } = await supabase.auth.getSession();
        const code = params.get('code');
        if (!data.session && code) {
          const exchanged = await supabase.auth.exchangeCodeForSession(code);
          data = exchanged.data;
          error = exchanged.error;
        }
        if (error || !data.session) throw error ?? new Error('Сессия Google не создана');

        const destination = await getAuthDestination(data.session.user.id);
        if (isActive) navigate(destination);
      } catch {
        if (!isActive) return;
        setMessage('Google не завершил вход. Аккаунт не потерян — попробуй ещё раз или войди через email.');
        setFailed(true);
      }
    }

    void finishGoogleSignIn();
    return () => { isActive = false; };
  }, [navigate]);

  return (
    <main className="auth-callback">
      <span className="auth-callback__logo">✦</span>
      <h1>GoalQuest</h1>
      <p>{message}</p>
      {failed
        ? <div className="auth-callback__actions">
          <Link href="/auth" className="auth-submit">Повторить вход</Link>
          <Link href="/" className="auth-switch">На главную</Link>
        </div>
        : <span className="auth-callback__loader" aria-hidden="true" />}
    </main>
  );
}

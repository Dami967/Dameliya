import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../lib/supabase';
import { getAuthDestination } from '../lib/authDestination';

export function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const [message, setMessage] = useState('Завершаем вход через Google…');

  useEffect(() => {
    let isActive = true;

    async function finishGoogleSignIn() {
      const { data, error } = await supabase.auth.getSession();
      if (!isActive) return;

      if (error || !data.session) {
        setMessage('Не удалось завершить вход. Попробуй ещё раз.');
        window.setTimeout(() => navigate('/auth?error=google'), 1800);
        return;
      }

      const destination = await getAuthDestination(data.session.user.id);
      if (!isActive) return;
      navigate(destination);
    }

    void finishGoogleSignIn();
    return () => { isActive = false; };
  }, [navigate]);

  return (
    <main className="auth-callback">
      <span className="auth-callback__logo">✦</span>
      <h1>GoalQuest</h1>
      <p>{message}</p>
      <span className="auth-callback__loader" aria-hidden="true" />
    </main>
  );
}

import { useSettings } from '../lib/useSettings';
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { isSupabaseConfigured } from '../lib/supabase';
import { useSession } from '../lib/useSession';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const { settings, loadError, retry } = useSettings(session?.user.id);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isSupabaseConfigured && !loading && !session) navigate('/');
  }, [loading, navigate, session]);

  if (loading) return <main className="center-loader">Открываем GoalQuest…</main>;
  if (isSupabaseConfigured && !session) return null;
  if (session && !settings) return <main className="center-loader" data-no-auto-translate>
    <p>{loadError || 'Загружаем настройки языка…'}</p>
    {loadError && <button onClick={retry}>Попробовать снова</button>}
  </main>;
  return children;
}

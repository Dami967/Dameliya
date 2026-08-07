import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { isSupabaseConfigured } from '../lib/supabase';
import { useSession } from '../lib/useSession';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isSupabaseConfigured && !loading && !session) navigate('/');
  }, [loading, navigate, session]);

  if (loading) return <main className="center-loader">Открываем GoalQuest…</main>;
  if (isSupabaseConfigured && !session) return null;
  return children;
}

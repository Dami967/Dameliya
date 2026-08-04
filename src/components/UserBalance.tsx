import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { loadProfile } from '../lib/userProfile';
import { useSession } from '../lib/useSession';
import { useCurrentProfile } from '../lib/useCurrentProfile';
import { Icon } from './Icon';

export function UserBalance() {
  const { session } = useSession();
  const profile = useCurrentProfile(session?.user.id);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!session) return;
    const refresh = () => void loadProfile(session.user.id).then(({ data }) => {
      if (data) window.dispatchEvent(new CustomEvent('goalquest-profile-changed', { detail: data }));
    });
    void supabase.rpc('sync_quest_progress').then(refresh);
    window.addEventListener('momentum-changed', refresh);
    window.addEventListener('profile-stats-changed', refresh);
    const timer = window.setInterval(() => tick((value) => value + 1), 60000);
    return () => {
      window.removeEventListener('momentum-changed', refresh);
      window.removeEventListener('profile-stats-changed', refresh);
      window.clearInterval(timer);
    };
  }, [session]);
  const updatedAt = profile ? new Date(profile.momentum_updated_at).getTime() : Date.now();
  const currentMomentum = profile
    ? Math.min(100, profile.momentum + Math.floor((Date.now() - updatedAt) / 600000)) : null;

  return <div className="rewards-balance">
    <span title="Momentum — энергия для общения с AI"><Icon name="zap" size={17} /> <b>{currentMomentum ?? '—'}</b></span>
    <span title="XP — опыт за выполненные задания">⭐ <b>{profile ? `${profile.xp.toLocaleString('ru-RU')} XP` : '— XP'}</b></span>
  </div>;
}

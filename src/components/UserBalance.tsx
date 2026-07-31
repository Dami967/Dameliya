import { useEffect, useState } from 'react';
import { loadProfile } from '../lib/userProfile';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/useSession';
import { Icon } from './Icon';

export function UserBalance() {
  const { session } = useSession();
  const [momentum, setMomentum] = useState(0);
  const [xp, setXp] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [, tick] = useState(0);

  useEffect(() => {
    if (!session) return;
    const refresh = () => void loadProfile(session.user.id).then(({ data }) => {
      if (data) {
        setMomentum(data.momentum); setXp(data.xp);
        setUpdatedAt(new Date(data.momentum_updated_at).getTime());
      }
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
  const currentMomentum = Math.min(100, momentum + Math.floor((Date.now() - updatedAt) / 600000));

  return <div className="rewards-balance">
    <span title="Momentum — энергия для общения с AI"><Icon name="zap" size={17} /> <b>{currentMomentum}</b></span>
    <span title="XP — опыт за выполненные задания">⭐ <b>{xp.toLocaleString('ru-RU')} XP</b></span>
  </div>;
}

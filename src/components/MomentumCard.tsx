import { useEffect, useState } from 'react';
import { loadProfile } from '../lib/userProfile';
import { useSession } from '../lib/useSession';
import { Icon } from './Icon';
import { MomentumActionModal } from './MomentumActionModal';

export function MomentumCard() {
  const { session } = useSession();
  const [value, setValue] = useState(100);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [, tick] = useState(0);
  const [action, setAction] = useState<'quiz' | 'report' | null>(null);
  useEffect(() => {
    if (!session) return;
    void loadProfile(session.user.id).then(({ data }) => {
      if (data) { setValue(data.momentum); setUpdatedAt(new Date(data.momentum_updated_at).getTime()); }
    });
    const changed = (event: Event) => {
      setValue((event as CustomEvent<number>).detail); setUpdatedAt(Date.now());
    };
    window.addEventListener('momentum-changed', changed);
    const timer = window.setInterval(() => tick((current) => current + 1), 1000);
    return () => { window.removeEventListener('momentum-changed', changed); window.clearInterval(timer); };
  }, [session]);
  const regenerated = Math.min(100, value + Math.floor((Date.now() - updatedAt) / 600000));
  const seconds = Math.max(0, 600 - Math.floor((Date.now() - updatedAt) / 1000) % 600);

  return <div className="momentum-card">
    <div className="momentum-card__top"><span><Icon name="zap" size={17} /> Momentum</span><b>{regenerated}/100</b></div>
    <div className="meter"><span style={{ width: `${regenerated}%` }} /></div>
    <small>{regenerated >= 100 ? 'Энергия заполнена' : `+1 через ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}</small>
    <div className="momentum-actions"><button onClick={() => setAction('quiz')}>Викторина +5</button>
      <button onClick={() => setAction('report')}>Отчёт +10</button></div>
    {action && session && <MomentumActionModal mode={action} userId={session.user.id} onClose={() => setAction(null)}
      onReward={(next) => {
        setValue(next); setUpdatedAt(Date.now());
        window.dispatchEvent(new CustomEvent('momentum-changed', { detail: next }));
      }} />}
  </div>;
}

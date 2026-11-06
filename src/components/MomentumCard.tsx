import { useState } from 'react';
import { useMomentum } from '../lib/useMomentum';
import { useSession } from '../lib/useSession';
import { Icon } from './Icon';
import { MomentumActionModal } from './MomentumActionModal';

export function MomentumCard() {
  const { session } = useSession();
  const { value: regenerated, seconds } = useMomentum(session?.user.id);
  const [action, setAction] = useState<'quiz' | 'report' | null>(null);

  return <div className="momentum-card">
    <div className="momentum-card__top"><span><Icon name="zap" size={17} /> Momentum</span><b>{regenerated}/100</b></div>
    <div className="meter"><span style={{ width: `${regenerated}%` }} /></div>
    <small>{regenerated >= 100 ? 'Энергия заполнена' : `+1 через ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}</small>
    <div className="momentum-actions"><button onClick={() => setAction('quiz')}>Викторина +5</button>
      <button onClick={() => setAction('report')}>Отчёт +10</button></div>
    {action && session && <MomentumActionModal mode={action} userId={session.user.id} onClose={() => setAction(null)}
      onReward={(next) => {
        window.dispatchEvent(new CustomEvent('momentum-changed', { detail: next }));
      }} />}
  </div>;
}

import { useEffect, useState } from 'react';
import { loadProfile } from '../lib/userProfile';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/useSession';
import { Icon } from './Icon';

export function MomentumCard() {
  const { session } = useSession();
  const [value, setValue] = useState(100);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [, tick] = useState(0);
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

  async function restore(kind: 'quiz' | 'report') {
    if (kind === 'quiz') {
      const answer = prompt('Мини-викторина: сколько будет 8 × 7?');
      if (answer?.trim() !== '56') return alert('Почти! Попробуй ещё раз.');
    } else {
      const report = prompt('Коротко напиши, что полезного ты сделал сегодня:');
      if (!report || report.trim().length < 20) return alert('Напиши отчёт немного подробнее — минимум 20 символов.');
    }
    const result = await supabase.rpc('restore_momentum', { action_kind: kind });
    if (result.error) return alert('Эту награду уже получали недавно. Попробуй позже.');
    setValue(result.data); setUpdatedAt(Date.now());
  }

  return <div className="momentum-card">
    <div className="momentum-card__top"><span><Icon name="zap" size={17} /> Momentum</span><b>{regenerated}/100</b></div>
    <div className="meter"><span style={{ width: `${regenerated}%` }} /></div>
    <small>{regenerated >= 100 ? 'Энергия заполнена' : `+1 через ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}</small>
    <div className="momentum-actions"><button onClick={() => void restore('quiz')}>Викторина +5</button>
      <button onClick={() => void restore('report')}>Отчёт +10</button></div>
  </div>;
}

import { useEffect, useState } from 'react';
import { loadProfile } from './userProfile';

export function useMomentum(userId?: string) {
  const [stored, setStored] = useState({ value: 100, updatedAt: Date.now() });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void loadProfile(userId).then(({ data }) => {
      if (active && data) setStored({ value: data.momentum, updatedAt: Date.parse(data.momentum_updated_at) });
    });
    const changed = (event: Event) => {
      setStored({ value: (event as CustomEvent<number>).detail, updatedAt: Date.now() });
      setNow(Date.now());
    };
    window.addEventListener('momentum-changed', changed);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; clearInterval(timer); window.removeEventListener('momentum-changed', changed); };
  }, [userId]);
  const elapsed = Math.max(0, now - stored.updatedAt);
  return { value: Math.min(100, stored.value + Math.floor(elapsed / 600000)),
    seconds: 600 - Math.floor(elapsed / 1000) % 600 };
}

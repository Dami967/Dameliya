import { useEffect, useState } from 'react';

export function ChallengeCountdown({ endsAt }: { endsAt: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const end = new Date(`${endsAt}T23:59:59`).getTime();
  const remaining = Math.max(0, end - Date.now());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor(remaining / 3600000) % 24;
  const minutes = Math.floor(remaining / 60000) % 60;
  const seconds = Math.floor(remaining / 1000) % 60;

  return <div className="competition-timer" aria-label="Время до завершения соревнования">
    <Time value={days} label="дней" /><i>:</i><Time value={hours} label="часов" />
    <i>:</i><Time value={minutes} label="минут" /><i>:</i><Time value={seconds} label="секунд" />
  </div>;
}

function Time({ value, label }: { value: number; label: string }) {
  return <span><b>{String(value).padStart(2, '0')}</b><small>{label}</small></span>;
}

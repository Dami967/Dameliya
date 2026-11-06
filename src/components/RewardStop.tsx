import { useState } from 'react';
import { openPersonalChest } from '../lib/personalChest';

export function RewardStop({ title, unlocked, planId, chapterIndex, prize, onOpened, preview = false }: {
  preview?: boolean; title: string; unlocked: boolean; planId?: string; chapterIndex: number; prize?: string;
  onOpened: (prize: string) => void;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  async function open() {
    if (import.meta.env.DEV && preview) { onOpened('🎉 Тестовый подарок: значок «Первый шаг»'); return; }
    if (!planId || opening) return;
    setOpening(true); setError('');
    try { onOpened(await openPersonalChest(planId, chapterIndex)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось открыть сундук. Попробуй снова.'); }
    finally { setOpening(false); }
  }
  return <><button type="button" disabled={!unlocked || Boolean(prize) || opening} onClick={() => void open()}
    className={`reward-stop ${unlocked ? 'is-ready' : 'is-locked'} ${prize ? 'is-opened' : ''}`}>
    <span>{prize ? '✨' : '🎁'}</span>
    <div><small>ПОДАРОК ПО ТВОИМ ИНТЕРЕСАМ</small><b>{prize || title}</b></div>
    <em>{prize ? 'Получен ✓' : opening ? 'Кью готовит приз…' : unlocked ? 'Открыть' : 'Выполни все 3'}</em>
  </button>{error && <p role="alert">{error}</p>}</>;
}

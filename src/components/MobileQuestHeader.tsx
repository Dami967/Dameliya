import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import type { AiQuestPlan } from '../lib/aiQuest';

export function MobileQuestHeader({ plans, selectedId, loading, onChange }: {
  plans: AiQuestPlan[];
  selectedId: string | null;
  loading: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const picker = useRef<HTMLDivElement>(null);
  const selected = plans.find((plan) => plan.id === selectedId) ?? plans[0];
  const selectedIndex = Math.max(0, plans.findIndex((plan) => plan.id === selected?.id));
  const touchStart = useRef<number | null>(null);

  function finishSwipe(clientX: number) {
    if (touchStart.current === null || plans.length < 2) return;
    const distance = clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) < 55) return;
    const nextIndex = (selectedIndex + (distance < 0 ? 1 : -1) + plans.length) % plans.length;
    onChange(plans[nextIndex].id);
  }

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!picker.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const title = selected?.goal || (loading ? 'Загружаем карту…' : 'Создай свою первую цель');
  return <header className="mobile-quest-header"
    onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
    onTouchEnd={(event) => finishSwipe(event.changedTouches[0]?.clientX ?? 0)}>
    <div className="mobile-quest-header__meta"><span>МОЙ КВЕСТ</span>
      <b>{plans.length ? `${selectedIndex + 1} / ${plans.length}` : 'НОВАЯ КАРТА'}</b></div>
    <h1>{title}</h1>
    <p>Большая цель становится простой, когда виден следующий шаг.</p>
    <div className="mobile-quest-actions">
      {plans.length > 0 && <div className="mobile-goal-picker" ref={picker}>
        <button type="button" className="mobile-goal-picker__trigger" aria-expanded={open}
          onClick={() => setOpen((value) => !value)}>
          <span><small>Текущая цель</small><b>{selected?.goal}</b></span><i>{open ? '↑' : '↓'}</i>
        </button>
        {open && <div className="mobile-goal-picker__menu" role="listbox">
          {plans.map((plan, index) => <button type="button" role="option" aria-selected={plan.id === selected?.id}
            className={plan.id === selected?.id ? 'is-selected' : ''} key={plan.id} onClick={() => {
              onChange(plan.id); setOpen(false);
            }}><span>{index + 1}</span><b>{plan.goal}</b>{plan.id === selected?.id && <i>✓</i>}</button>)}
        </div>}
      </div>}
      <Link href="/mentor?new=1" className="mobile-new-goal"><span>＋</span><b>Новая цель</b></Link>
    </div>
  </header>;
}

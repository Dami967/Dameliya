import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AppShell } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { QuestMap } from '../components/QuestMap';
import { loadAiQuests, type AiQuestPlan } from '../lib/aiQuest';
import { useSession } from '../lib/useSession';

export function QuestPage() {
  const { session } = useSession();
  const [, navigate] = useLocation();
  const [plans, setPlans] = useState<AiQuestPlan[]>([]);
  const requestedId = new URLSearchParams(window.location.search).get('plan');

  useEffect(() => {
    if (!session) return;
    void loadAiQuests(session.user.id).then(({ data }) => setPlans(data ?? []));
  }, [session]);

  const selectedIndex = Math.max(0, plans.findIndex((plan) => plan.id === requestedId));
  const plan = plans[selectedIndex] ?? null;
  const steps = plan?.steps ?? [];
  const done = steps.filter((step) => step.state === 'done');
  const percent = steps.length ? Math.round(done.length / steps.length * 100) : 0;
  const earnedXp = done.reduce((sum, step) => sum + step.xp, 0);

  function choose(index: number) {
    const next = plans[(index + plans.length) % plans.length];
    if (next) navigate(`/quest?plan=${next.id}`);
  }

  return <AppShell>
    <header className="page-header quest-page-head">
      <button className="quest-switch" disabled={plans.length < 2} onClick={() => choose(selectedIndex - 1)}
        aria-label="Предыдущая карта">←</button>
      <div><span className="eyebrow">МОЙ КВЕСТ · {selectedIndex + 1} ИЗ {plans.length || 1}</span>
        <h1>{plan?.goal || 'Создай свою первую цель'}</h1>
        <p>Большая цель становится простой, когда виден следующий шаг.</p>
        <Link href="/mentor?new=1" className="new-quest-link">＋ Новая цель</Link></div>
      <button className="quest-switch" disabled={plans.length < 2} onClick={() => choose(selectedIndex + 1)}
        aria-label="Следующая карта">→</button>
    </header>
    {plan ? <div className="quest-page-grid">
      <QuestMap steps={plan.steps} title={plan.map_title} planId={plan.id} />
      <aside className="goal-summary">
        <div className="summary-orb"><Icon name="rocket" size={34} /></div>
        <h3>Твой прогресс</h3>
        <div className="big-progress">{percent}<span>%</span></div>
        <div className="summary-row"><span>Заданий готово</span><b>{done.length} / {steps.length}</b></div>
        <div className="summary-row"><span>Заработано</span><b>{earnedXp} XP</b></div>
        <div className="summary-row"><span>Активных карт</span><b>{plans.length}</b></div>
        <Link href="/mentor" className="secondary-button"><Icon name="sparkles" size={18} /> Добавить или изменить цель</Link>
      </aside>
    </div> : <section className="empty-state"><Icon name="map" size={40} /><h2>Карт пока нет</h2>
      <p>Расскажи Кью о цели, и он создаст первую экспедицию.</p><Link href="/mentor" className="primary-button">Создать цель</Link></section>}
  </AppShell>;
}

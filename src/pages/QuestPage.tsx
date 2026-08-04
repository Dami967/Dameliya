import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AppShell } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { QuestMap } from '../components/QuestMap';
import { QuestGoalPicker, QuestGoalTabs } from '../components/QuestGoalPicker';
import { deleteAiQuest, loadAiQuests, type AiQuestPlan } from '../lib/aiQuest';
import { useSession } from '../lib/useSession';
import { ensureQuestInsights } from '../lib/questInsights';
import { activeQuestId, rememberActiveQuest } from '../lib/activeQuest';
import { ExternalProgressModal } from '../components/ExternalProgressModal';
import { cachedQuestPlans, cacheQuestPlans } from '../lib/questCache';

export function QuestPage() {
  const { session } = useSession();
  const [, navigate] = useLocation();
  const [plans, setPlans] = useState<AiQuestPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showExternalProgress, setShowExternalProgress] = useState(false);
  const requestedId = new URLSearchParams(window.location.search).get('plan');

  useEffect(() => {
    if (!session) return;
    let activeRequest = true;
    setPlans([]);
    setSelectedPlanId(null);
    setPlansLoading(true);
    const cached = cachedQuestPlans(session.user.id);
    if (cached.length) setPlans(cached);
    void loadAiQuests(session.user.id).then(({ data }) => {
      if (!activeRequest) return;
      const loaded = data ?? [];
      setPlans(loaded);
      const preferred = requestedId ?? activeQuestId();
      const selected = loaded.some((plan) => plan.id === preferred) ? preferred : loaded[0]?.id ?? null;
      setSelectedPlanId((current) => current ?? selected);
      if (selected) rememberActiveQuest(selected);
      setPlansLoading(false);
    });
    return () => { activeRequest = false; };
  }, [session]);

  const selectedIndex = Math.max(0, plans.findIndex((plan) => plan.id === selectedPlanId));
  const plan = plans[selectedIndex] ?? null;
  const steps = plan?.steps ?? [];
  const done = steps.filter((step) => step.state === 'done');
  const percent = steps.length ? Math.round(done.length / steps.length * 100) : 0;
  const earnedXp = done.reduce((sum, step) => sum + step.xp, 0);

  useEffect(() => {
    if (!session || !plan || !done.length) return;
    void ensureQuestInsights(session.user.id, plan).then(({ data }) => {
      setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, insights: data } : item));
    });
  }, [done.length, plan?.id, session]);

  function choose(index: number) {
    const next = plans[(index + plans.length) % plans.length];
    if (next) {
      setSelectedPlanId(next.id);
      rememberActiveQuest(next.id);
      navigate(`/quest?plan=${next.id}`, { replace: true });
    }
  }

  function chooseById(id: string) {
    setSelectedPlanId(id);
    rememberActiveQuest(id);
    navigate(`/quest?plan=${id}`, { replace: true });
  }

  async function removePlan() {
    if (!plan || deleting) return;
    if (!window.confirm(`Удалить цель «${plan.goal}» и все записи её заданий? Это действие нельзя отменить.`)) return;
    setDeleting(true);
    const result = await deleteAiQuest(plan.id);
    if (result.error) {
      window.alert('Не удалось удалить цель. Попробуй ещё раз.');
      setDeleting(false); return;
    }
    const remaining = plans.filter((item) => item.id !== plan.id);
    if (session) cacheQuestPlans(session.user.id, remaining);
    const next = remaining[Math.min(selectedIndex, Math.max(0, remaining.length - 1))] ?? null;
    setPlans(remaining);
    setSelectedPlanId(next?.id ?? null);
    navigate(next ? `/quest?plan=${next.id}` : '/quest', { replace: true });
    setDeleting(false);
  }

  return <AppShell>
    <header className="page-header quest-page-head">
      <button className="quest-switch" disabled={plans.length < 2} onClick={() => choose(selectedIndex - 1)}
        aria-label="Предыдущая карта">←</button>
      <div><span className="eyebrow">МОЙ КВЕСТ · {selectedIndex + 1} ИЗ {plans.length || 1}</span>
        <h1>{plan?.goal || (plansLoading ? 'Загружаем карту…' : 'Создай свою первую цель')}</h1>
        <p>Большая цель становится простой, когда виден следующий шаг.</p>
        <QuestGoalPicker plans={plans} selectedId={selectedPlanId} onChange={chooseById} />
        <Link href="/mentor?new=1" className="new-quest-link">＋ Новая цель</Link></div>
      <button className="quest-switch" disabled={plans.length < 2} onClick={() => choose(selectedIndex + 1)}
        aria-label="Следующая карта">→</button>
    </header>
    <QuestGoalTabs plans={plans} selectedId={selectedPlanId} onChange={chooseById} />
    {plan ? <div className="quest-page-grid">
      <QuestMap steps={plan.steps} title={plan.map_title} planId={plan.id} />
      <aside className="goal-summary">
        <div className="summary-orb"><Icon name="rocket" size={34} /></div>
        <h3>Твой прогресс</h3>
        <div className="big-progress">{percent}<span>%</span></div>
        <div className="summary-row"><span>Заданий готово</span><b>{done.length} / {steps.length}</b></div>
        <div className="summary-row"><span>Заработано</span><b>{earnedXp} XP</b></div>
        <div className="summary-row"><span>Активных карт</span><b>{plans.length}</b></div>
        <section className="quest-insight"><span>✨ ЗАМЕТКИ ОТ КЬЮ</span>
          {plan.insights?.length ? <div className="quest-insight-list">{plan.insights.map((item) =>
            <article key={item.step_id}><b>Этап {item.step_id} · {item.title}</b><p>{item.note}</p></article>)}</div>
            : <p>{done.length ? 'Кью анализирует разговор и заметки завершённого этапа…'
              : `После этапа «${steps[0]?.title}» Кью сохранит здесь твою главную мысль.`}</p>}
        </section>
        <button className="external-progress-button" onClick={() => setShowExternalProgress(true)}>
          <Icon name="sparkles" size={17} /> Я продвинулся самостоятельно</button>
        <Link href="/mentor?choose=1" className="secondary-button"><Icon name="sparkles" size={18} /> Добавить или изменить цель</Link>
        <button className="delete-quest-button" disabled={deleting} onClick={() => void removePlan()}>
          {deleting ? 'Удаляем…' : 'Удалить эту цель'}</button>
      </aside>
    </div> : plansLoading ? <section className="center-loader">Загружаем твою карту приключений…</section>
      : <section className="empty-state"><Icon name="map" size={40} /><h2>Личных карт пока нет</h2>
      <p>Расскажи Кью о цели, и он создаст первую экспедицию.</p><Link href="/mentor" className="primary-button">Создать цель</Link></section>}
    {showExternalProgress && session && plan && <ExternalProgressModal userId={session.user.id} plan={plan}
      onClose={() => setShowExternalProgress(false)} onAdapted={(updated) => setPlans((current) =>
        current.map((item) => item.id === updated.id ? updated : item))} />}
  </AppShell>;
}

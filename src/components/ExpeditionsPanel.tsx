import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { loadAiQuests, type AiQuestPlan } from '../lib/aiQuest';
import { useSession } from '../lib/useSession';
import { Icon } from './Icon';
import { cachedQuestPlans } from '../lib/questCache';

export function ExpeditionsPanel() {
  const { session } = useSession();
  const [plans, setPlans] = useState<AiQuestPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    if (!session) return;
    const cached = cachedQuestPlans(session.user.id);
    if (cached.length) setPlans(cached);
    void loadAiQuests(session.user.id).then(({ data, error }) => {
      if (!error) setPlans(data ?? []);
      setSelectedId((current) => current || data?.[0]?.id || '');
      setLoading(false);
    });
  }, [session]);
  const active = plans.find((plan) => plan.id === selectedId) ?? plans[0];
  if (!active && loading) return <section className="rewards-panel-loading"><Icon name="map" size={34} />
    <b>Загружаем экспедиции…</b></section>;
  if (!active) return <section className="empty-state"><Icon name="map" size={40} />
    <h2>Экспедиций пока нет</h2><p>Создай цель вместе с Кью — здесь появится её путешествие.</p>
    <Link href="/mentor" className="primary-button">Создать цель</Link></section>;
  const done = active.steps.filter((step) => step.state === 'done');
  const percent = Math.round(done.length / Math.max(active.steps.length, 1) * 100);
  const xp = done.reduce((sum, step) => sum + step.xp, 0);

  return <div className="expeditions-layout">
    <section className="active-expedition">
      <div><span className="eyebrow">АКТИВНАЯ ЭКСПЕДИЦИЯ</span><h2>{goalIcon(active.goal)} {active.map_title}</h2>
        <p>{active.goal}</p></div>
      <div className="expedition-scene"><span>🏕️</span><i>🦅</i><b>🗺️</b><em>{goalIcon(active.goal)}</em></div>
      <div className="expedition-track"><span style={{ width: `${percent}%` }} /><i style={{ left: `${percent}%` }}>✦</i></div>
      <div className="expedition-stats"><span><b>{done.length}/{active.steps.length}</b><small>этапов</small></span>
        <span><b>{xp} XP</b><small>заработано</small></span><span><b>{percent}%</b><small>пройдено</small></span></div>
      <Link href={`/quest?plan=${active.id}`} className="primary-button">Продолжить задания <Icon name="arrow" size={16} /></Link>
    </section>
    <section className="expedition-list"><div className="section-heading"><h2>Все экспедиции</h2>
      <span className="progress-pill">{plans.length} активн.</span></div>
      {plans.map((plan) => {
        const complete = plan.steps.filter((step) => step.state === 'done').length;
        const progress = Math.round(complete / Math.max(plan.steps.length, 1) * 100);
        return <button className={plan.id === active.id ? 'is-active' : ''} key={plan.id}
          onClick={() => setSelectedId(plan.id)}>
          <span className="expedition-icon">{goalIcon(plan.goal)}</span><div><b>{plan.map_title}</b><small>{plan.goal}</small>
            <span className="mini-track"><i style={{ width: `${progress}%` }} /></span></div>
          <span className="expedition-reward"><small>Прогресс</small><b>{complete}/{plan.steps.length}</b></span>
        </button>;
      })}
    </section>
  </div>;
}

function goalIcon(goal: string) {
  const value = goal.toLowerCase();
  if (/англ|язык|ielts/.test(value)) return '📚';
  if (/стартап|бизнес|продукт/.test(value)) return '🚀';
  if (/спорт|здоров|бег/.test(value)) return '🏃';
  if (/рис|дизайн|твор/.test(value)) return '🎨';
  return '🗺️';
}

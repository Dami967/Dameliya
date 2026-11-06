import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import type { AiQuestPlan } from '../lib/aiQuest';
import { loadReviews, type QuestReview } from '../lib/questReview';

export function GoalProgress({ plan }: { plan: AiQuestPlan }) {
  const [reviews, setReviews] = useState<QuestReview[]>([]);
  useEffect(() => {
    let active = true;
    setReviews([]);
    const refresh = () => { void loadReviews(plan.user_id, plan.id).then(({ data }) => { if (active) setReviews(data ?? []); }); };
    refresh();
    window.addEventListener('quest-progress-changed', refresh);
    return () => { active = false; window.removeEventListener('quest-progress-changed', refresh); };
  }, [plan.id, plan.user_id]);
  const completed = plan.steps.filter((step) => step.state === 'done');
  const checked = reviews.filter((review) => review.best_score !== null);
  const mastered = checked.filter((review) => (review.best_score ?? 0) >= 3);
  const average = checked.length ? Math.round(checked.reduce((sum, review) => sum + (review.best_score ?? 0), 0) / (checked.length * 5) * 100) : null;
  return <section className="goal-progress-panel" aria-label="Результаты по цели">
    <h3>Что уже получилось</h3>
    <div className="goal-progress-numbers"><span><b>{completed.length}/{plan.steps.length}</b> выполнено</span>
      <span><b>{mastered.length}</b> закреплено</span><span><b>{average === null ? '—' : `${average}%`}</b> в викторинах</span></div>
    {completed.length ? <details><summary>Мои освоенные этапы и игры</summary>
      {completed.map((step) => <div className="completed-skill" key={step.id}><span>✓ {step.title}</span>
        <Link href={`/review/${plan.id}/${step.id}`}>{reviews.find((item) => item.step_id === step.id)?.best_score == null
          ? 'Закрепить →' : 'Повторить →'}</Link></div>)}
    </details> : <p>Здесь появятся выполненные этапы и результаты закрепления.</p>}
  </section>;
}

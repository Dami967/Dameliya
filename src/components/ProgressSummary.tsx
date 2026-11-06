import type { AiQuestPlan } from '../lib/aiQuest';

export function ProgressSummary({ plan, totalPlans, embedded = false }: {
  plan: AiQuestPlan; totalPlans: number; embedded?: boolean;
}) {
  const completed = plan.steps.filter((step) => step.state === 'done');
  const percent = plan.steps.length ? Math.round(completed.length / plan.steps.length * 100) : 0;
  const earnedXp = completed.reduce((sum, step) => sum + step.xp, 0);

  return <section className={`progress-summary${embedded ? ' progress-summary--embedded' : ''}`}
    aria-label={`Прогресс по цели: ${plan.goal}`}>
    <div className="progress-summary__headline">
      <h3>Твой прогресс</h3>
      <div className="progress-summary__percent" role="progressbar" aria-label="Пройдено этапов"
        aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        {percent}<span>%</span>
      </div>
    </div>
    <dl className="progress-summary__stats">
      <div><dt>Заданий готово</dt><dd>{completed.length} / {plan.steps.length}</dd></div>
      <div><dt>Заработано</dt><dd>{earnedXp} XP</dd></div>
      <div><dt>Активных карт</dt><dd>{totalPlans}</dd></div>
    </dl>
  </section>;
}

import { Link } from 'wouter';
import type { AiQuestPlan } from '../lib/aiQuest';

export function ExpeditionCheckpoints({ plan }: { plan: AiQuestPlan }) {
  const checkpoints = plan.steps.filter((_, index) => (index + 1) % 3 === 0);
  return <div className="expedition-checkpoints"><h3>Игровые остановки</h3>
    <p>Каждые три этапа — игра по пройденной теме. За 3 верных ответа из 5 получишь персональный приз.</p>
    <div>{checkpoints.map((step, index) => step.state === 'done'
      ? <Link key={step.id} href={`/review/${plan.id}/${step.id}`} className="checkpoint"><span>{['🏕️', '🧩', '🏆'][index % 3]}</span>Этап {step.id} · Играть</Link>
      : <span key={step.id} className="checkpoint is-locked"><span>🔒</span>После этапа {step.id}</span>)}</div>
  </div>;
}

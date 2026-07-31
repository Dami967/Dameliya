import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { AppShell } from '../components/AppShell';
import { QuestMap } from '../components/QuestMap';
import { Icon } from '../components/Icon';
import { loadAiQuest, type AiQuestPlan } from '../lib/aiQuest';
import { useSession } from '../lib/useSession';

export function QuestPage() {
  const { session } = useSession();
  const [plan, setPlan] = useState<AiQuestPlan | null>(null);
  useEffect(() => {
    if (session) void loadAiQuest(session.user.id).then(({ data }) => setPlan(data));
  }, [session]);
  const steps = plan?.steps ?? [];
  const done = steps.filter((step) => step.state === 'done');
  const percent = steps.length ? Math.round(done.length / steps.length * 100) : 0;
  const earnedXp = done.reduce((sum, step) => sum + step.xp, 0);
  return (
    <AppShell>
      <header className="page-header">
        <div><span className="eyebrow">МОЙ КВЕСТ</span><h1>{plan?.goal || 'Запустить свой первый стартап'}</h1>
          <p>Большая цель становится простой, когда виден следующий шаг.</p></div>
        <button className="icon-button" aria-label="Настройки"><Icon name="target" /></button>
      </header>
      <div className="quest-page-grid">
        <QuestMap steps={plan?.steps} title={plan?.map_title} />
        <aside className="goal-summary">
          <div className="summary-orb"><Icon name="rocket" size={34} /></div>
          <h3>Твой прогресс</h3>
          <div className="big-progress">{percent}<span>%</span></div>
          <div className="summary-row"><span>Заданий готово</span><b>{done.length} / {steps.length || 10}</b></div>
          <div className="summary-row"><span>Заработано</span><b>{earnedXp} XP</b></div>
          <div className="summary-row"><span>Время в пути</span><b>7 дней</b></div>
          <Link href="/mentor" className="secondary-button"><Icon name="sparkles" size={18} /> Изменить план с AI</Link>
        </aside>
      </div>
    </AppShell>
  );
}

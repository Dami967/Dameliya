import { useEffect, useState } from 'react';
import { loadActiveQuest } from './activeQuest';
import { prepareReview, type ReviewQuestion } from './questReview';

export function useDeveloperReview(userId: string | undefined, attempt: number) {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true); setError(''); setQuestions([]);
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const result = await loadActiveQuest(userId, params.get('plan'));
      if (result.error || !result.data) throw new Error('Сначала выбери цель на карте.');
      const plan = result.data;
      const requestedStep = Number(params.get('step'));
      const step = plan.steps.find((item) => item.id === requestedStep)
        ?? plan.steps.find((item) => item.state === 'active') ?? plan.steps[0];
      if (!step) throw new Error('В этой цели пока нет заданий.');
      if (active) setTitle(`${plan.map_title} · ${step.title}`);
      const review = await prepareReview(userId, plan, step, true);
      if (active) setQuestions(review.questions);
    })().catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Не удалось подготовить игру.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, attempt]);
  return { questions, title, error, loading };
}

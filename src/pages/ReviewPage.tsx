import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { AppShell } from '../components/AppShell';
import { ReviewGame } from '../components/ReviewGame';
import { useSession } from '../lib/useSession';
import { loadAiQuestById } from '../lib/aiQuest';
import { finishReview, prepareReview, type QuestReview } from '../lib/questReview';
import { claimReviewReward } from '../lib/reviewReward';

export function ReviewPage() {
  const { session } = useSession();
  const [, params] = useRoute('/review/:planId/:stepId');
  const [review, setReview] = useState<QuestReview | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [reward, setReward] = useState('');
  const planId = params?.planId ?? '';
  const stepId = Number(params?.stepId);
  const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1';
  useEffect(() => {
    if (!session || !planId) return;
    let active = true;
    setError(''); setReview(null); setScore(null); setReward('');
    void (async () => {
      const result = await loadAiQuestById(session.user.id, planId);
      if (!result.data) throw new Error('Карта не найдена.');
      const step = result.data.steps.find((item) => item.id === stepId);
      if (!step || (step.state !== 'done' && !preview)) throw new Error('Сначала заверши этот этап на карте.');
      const data = await prepareReview(session.user.id, result.data, step, preview);
      if (active) { setReview(data); setTitle(step.title); }
    })().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Не удалось открыть игру.'); });
    return () => { active = false; };
  }, [session?.user.id, planId, stepId, attempt]);

  async function finish(answers: number[]) {
    setBusy(true); setError('');
    try {
      if (preview && review) {
        setScore(answers.reduce((total, answer, index) => total + (answer === review.questions[index]?.correct ? 1 : 0), 0));
        return;
      }
      const result = await finishReview(planId, stepId, answers);
      setScore(result);
      if (result >= 3 && stepId % 3 === 0) setReward(await claimReviewReward(planId, stepId));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить результат.'); }
    finally { setBusy(false); }
  }
  return <AppShell><div className="review-page"><Link href={`/quest?plan=${planId}`}>← К карте</Link>
    <header className="page-header"><div><h1>Закрепляем навык</h1><p>{title}</p></div></header>
    {error && <p role="alert">{error} {!review && <button onClick={() => setAttempt(attempt + 1)}>Повторить загрузку</button>}</p>}
    {score !== null ? <section className="content-card"><h2>{score} из 5 — {preview ? 'предпросмотр' : 'результат сохранён'}</h2>
      <p>{score >= 3 ? 'Хорошая работа! Можно продолжать путь.' : 'Повтори карточки и попробуй ещё раз.'}</p>
      {reward && <p>{reward}</p>}
      {busy ? <p>Кью готовит приз по твоим интересам…</p> : <>
        <button onClick={() => { setScore(null); setAttempt(attempt + 1); }}>Повторить</button>
        <Link href={`/rewards?section=expeditions`}>К экспедиции →</Link></>}
    </section> : review ? <ReviewGame initialMode={new URLSearchParams(window.location.search).get('mode') === 'cards' ? 'cards' : 'quiz'} key={`${planId}-${stepId}-${attempt}`} questions={review.questions} onFinish={(answers) => void finish(answers)} busy={busy} />
      : !error && <p>Кью готовит игру по пройденному уроку…</p>}
  </div></AppShell>;
}

import { useEffect, useState } from 'react';
import { askAi, parseAiJson } from '../lib/ai';
import { loadAiQuest } from '../lib/aiQuest';
import { loadQuestLearning } from '../lib/questLearning';
import { supabase } from '../lib/supabase';

type Quiz = { question: string; options: string[]; correct_index: number };

export function MomentumActionModal({ mode, userId, onClose, onReward }: {
  mode: 'quiz' | 'report'; userId: string; onClose: () => void; onReward: (value: number) => void;
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(mode === 'quiz');

  useEffect(() => {
    if (mode !== 'quiz') return;
    void personalContext(userId).then(async (context) => {
      const result = await askAi(`${context}\nСоздай один полезный вопрос, который проверяет понимание текущей цели.
Верни только JSON: {"question":"вопрос","options":["вариант 1","вариант 2","вариант 3"],"correct_index":0}.`,
      'Ты создаёшь короткую персональную обучающую викторину на русском. Только валидный JSON.');
      try {
        const value = parseAiJson<Quiz>(result.text ?? '');
        if (value.options.length !== 3) throw new Error();
        setQuiz(value);
      } catch { setFeedback(result.error?.message ?? 'Не удалось создать вопрос. Попробуй ещё раз.'); }
      setBusy(false);
    });
  }, [mode, userId]);

  async function submit() {
    if (!answer || busy) return;
    setBusy(true);
    if (mode === 'quiz' && quiz && Number(answer) !== quiz.correct_index) {
      setFeedback('Пока не совсем так. Посмотри на цель ещё раз и попробуй другой вариант.');
      setBusy(false); return;
    }
    if (mode === 'report' && answer.trim().length < 20) {
      setFeedback('Добавь чуть больше деталей: что сделал, что получилось и что было трудно.');
      setBusy(false); return;
    }
    let analysis = '';
    if (mode === 'report') {
      const context = await personalContext(userId);
      const review = await askAi(`${context}\nОтчёт пользователя: ${answer}\nКоротко назови один успех и один подходящий следующий шаг.`,
        'Ты добрый наставник. Анализируй отчёт относительно личной цели. Ответь по-русски в 2 предложениях.');
      if (review.error) { setFeedback(review.error.message); setBusy(false); return; }
      analysis = review.text ?? 'Отчёт принят.';
      setFeedback(analysis);
    }
    const result = await supabase.rpc('restore_momentum', { action_kind: mode });
    if (result.error) {
      setFeedback('Награда за это действие уже получена недавно. Вернись чуть позже.');
      setBusy(false); return;
    }
    onReward(result.data);
    const learningText = mode === 'quiz' && quiz
      ? `Вопрос: ${quiz.question}\nВерный ответ пользователя: ${quiz.options[quiz.correct_index]}`
      : `Отчёт пользователя: ${answer}`;
    await supabase.rpc('save_momentum_learning', {
      action_kind: mode, content_text: learningText, analysis_text: analysis,
    });
    if (mode === 'quiz') setFeedback('Верно! Кью учтёт этот результат в следующих заданиях. +5 Momentum');
    setBusy(false);
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><section className="social-modal momentum-dialog"
    onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose}>×</button>
    <span className="eyebrow">{mode === 'quiz' ? 'ПЕРСОНАЛЬНАЯ ВИКТОРИНА' : 'ОТЧЁТ О ПРОГРЕССЕ'}</span>
    <h2>{mode === 'quiz' ? quiz?.question || 'Кью готовит вопрос…' : 'Что ты сделал для своей цели?'}</h2>
    {mode === 'quiz' && quiz && <div className="momentum-options">{quiz.options.map((option, index) =>
      <button className={answer === String(index) ? 'is-selected' : ''} key={option}
        onClick={() => setAnswer(String(index))}>{option}</button>)}</div>}
    {mode === 'report' && <textarea value={answer} onChange={(event) => setAnswer(event.target.value)}
      placeholder="Например: сегодня я занималась 25 минут, получилось…, было трудно…" />}
    {feedback && <p className="momentum-feedback">{feedback}</p>}
    <button className="social-primary" disabled={!answer || busy} onClick={() => void submit()}>
      {busy ? 'Кью анализирует…' : mode === 'quiz' ? 'Проверить ответ' : 'Отправить отчёт'}</button>
  </section></div>;
}

async function personalContext(userId: string) {
  const { data: plan } = await loadAiQuest(userId);
  if (!plan) return 'У пользователя пока нет активной цели.';
  const { context } = await loadQuestLearning(userId, plan.goal);
  return `Цель: ${plan.goal}. Текущий этап: ${plan.steps.find((step) => step.state === 'active')?.title || 'не выбран'}.
Результаты прошлых заданий: ${context || 'пока нет'}.`;
}

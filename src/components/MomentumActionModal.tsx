import { useEffect, useState } from 'react';
import { askAi, parseAiJson } from '../lib/ai';
import { loadAiQuests, type AiQuestPlan } from '../lib/aiQuest';
import { loadQuestLearning } from '../lib/questLearning';
import { supabase } from '../lib/supabase';
import { detectLanguage, languageName } from '../lib/languages';
import { loadInterviewContext } from '../lib/interviewContext';
import { loadActiveQuest } from '../lib/activeQuest';

type Quiz = { question: string; options: string[]; correct_index: number };

export function MomentumActionModal({ mode, userId, onClose, onReward }: {
  mode: 'quiz' | 'report'; userId: string; onClose: () => void; onReward: (value: number) => void;
}) {
  const [quiz, setQuiz] = useState<Quiz[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<AiQuestPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [language, setLanguage] = useState(detectLanguage);

  useEffect(() => {
    const changed = (event: Event) => setLanguage((event as CustomEvent<string>).detail || detectLanguage());
    window.addEventListener('goalquest-language-changed', changed);
    return () => window.removeEventListener('goalquest-language-changed', changed);
  }, []);

  useEffect(() => {
    if (mode !== 'quiz') return;
    void loadAiQuests(userId).then(({ data, error }) => {
      setPlans(data ?? []);
      if (error) setFeedback('Не удалось загрузить цели. Закрой окно и попробуй снова.');
    });
  }, [mode, userId]);

  async function createQuiz() {
    const plan = plans.find((item) => item.id === selectedPlanId);
    if (!plan || busy) return;
    setBusy(true); setFeedback(''); setQuiz([]); setAnswer(''); setQuestionIndex(0);
    const context = await personalContext(userId, plan);
    const result = await askAi(`${context}\nСоздай ровно 5 разных полезных вопросов по знаниям, которые нужны для этой цели.
Не спрашивай личные данные или формулировку цели. В каждом вопросе ровно один верный ответ.
Верни только JSON: {"questions":[{"question":"вопрос","options":["вариант 1","вариант 2","вариант 3"],"correct_index":0}]}.`,
    `Ты создаёшь персональную викторину из 5 вопросов на языке ${languageName(language)}. Только валидный JSON без markdown.`,
    [], false, true);
    try {
      const value = parseAiJson<{ questions?: Partial<Quiz>[] }>(result.text ?? '');
      const questions = (value.questions ?? []).map(normalizeQuiz).filter((item): item is Quiz => Boolean(item));
      if (questions.length !== 5) throw new Error();
      setQuiz(questions);
    } catch { setFeedback(result.error?.message ?? 'Не удалось создать вопрос. Попробуй ещё раз.'); }
    setBusy(false);
  }

  async function submit() {
    if (!answer || busy) return;
    setBusy(true);
    const currentQuiz = quiz[questionIndex];
    if (mode === 'quiz' && currentQuiz && Number(answer) !== currentQuiz.correct_index) {
      setFeedback('Пока не совсем так. Посмотри на цель ещё раз и попробуй другой вариант.');
      setBusy(false); return;
    }
    if (mode === 'quiz' && questionIndex < 4) {
      setQuestionIndex((index) => index + 1); setAnswer('');
      setFeedback(`Верно! Следующий вопрос: ${questionIndex + 2} из 5.`); setBusy(false); return;
    }
    if (mode === 'report' && countWords(answer) < 50) {
      setFeedback(`Нужно не менее 50 слов. Сейчас: ${countWords(answer)}.`);
      setBusy(false); return;
    }
    let analysis = '';
    if (mode === 'report') {
      const context = await personalContext(userId);
      const review = await askAi(`${context}\nОтчёт пользователя: ${answer}\nКоротко назови один успех и один подходящий следующий шаг.`,
        `Ты добрый наставник. Анализируй отчёт относительно личной цели. Ответь на языке ${languageName(language)} в 2 предложениях.`);
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
    const selectedPlan = plans.find((item) => item.id === selectedPlanId);
    const learningText = mode === 'quiz' && quiz.length
      ? `Цель: ${selectedPlan?.goal || 'не указана'}\n${quiz.map((item, index) =>
        `${index + 1}. ${item.question}\nОтвет: ${item.options[item.correct_index]}`).join('\n')}`
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
    <header className="momentum-dialog__header"><span>{mode === 'quiz' ? '🧠' : '📝'}</span><div>
      <small>{mode === 'quiz' ? 'ПЕРСОНАЛЬНАЯ ВИКТОРИНА' : 'ОТЧЁТ О ПРОГРЕССЕ'}</small>
      <h2>{mode === 'quiz' ? quiz[questionIndex]?.question || 'Выбери цель для викторины' : 'Что ты сделал для своей цели?'}</h2>
      <p>{mode === 'quiz' ? 'Пять вопросов по знаниям для твоей цели' : 'Зафиксируй результат, трудности и следующий шаг'}</p>
    </div></header>
    {mode === 'quiz' && !quiz.length && <div className="quiz-goal-picker">
      <select value={selectedPlanId} disabled={busy} onChange={(event) => {
        setSelectedPlanId(event.target.value); setFeedback('');
      }}><option value="">Выбрать цель…</option>{plans.map((plan) =>
        <option value={plan.id} key={plan.id}>{plan.goal}</option>)}</select>
      {!plans.length && !feedback && <small>Сначала создай хотя бы одну цель.</small>}
    </div>}
    {mode === 'quiz' && quiz.length > 0 && <><div className="momentum-question-progress"><span>Вопрос {questionIndex + 1} из 5</span>
      <i><b style={{ width: `${(questionIndex + 1) * 20}%` }} /></i></div>
      <div className="momentum-options">{quiz[questionIndex].options.map((option, index) =>
      <button className={answer === String(index) ? 'is-selected' : ''} key={option}
        onClick={() => { setAnswer(String(index)); setFeedback(''); }}>{option}</button>)}</div></>}
    {mode === 'report' && <div className="momentum-report"><div className="momentum-report__tips">
      <span>✓ Что сделал</span><span>★ Что получилось</span><span>→ Что дальше</span></div>
      <textarea value={answer} onChange={(event) => setAnswer(event.target.value)}
        placeholder="Опиши минимум в 50 словах: что сделал, что получилось и что было трудно…" />
      <div className="momentum-word-count"><i><b style={{ width: `${Math.min(100, countWords(answer) * 2)}%` }} /></i>
        <small>{countWords(answer)} / 50 слов</small></div></div>}
    {feedback && <p className="momentum-feedback">{feedback}</p>}
    {mode === 'quiz' && !quiz.length ? <button className="social-primary" disabled={!selectedPlanId || busy}
      onClick={() => void createQuiz()}>{busy ? 'Кью создаёт викторину…' : feedback ? 'Попробовать снова' : 'Создать викторину'}</button>
      : <button className="social-primary" disabled={!answer || busy} onClick={() => void submit()}>
        {busy ? 'Кью анализирует…' : mode === 'quiz' ? 'Проверить ответ' : 'Отправить отчёт'}</button>}
  </section></div>;
}

function normalizeQuiz(value: Partial<Quiz>): Quiz | null {
  const options = Array.isArray(value.options) ? value.options.map(String) : [];
  const correctIndex = Number(value.correct_index);
  if (!value.question || options.length !== 3 || !Number.isInteger(correctIndex)
    || correctIndex < 0 || correctIndex > 2) return null;
  return { question: String(value.question), options, correct_index: correctIndex };
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

async function personalContext(userId: string, selectedPlan?: AiQuestPlan) {
  const [planResult, interview] = await Promise.all([
    selectedPlan ? Promise.resolve({ data: selectedPlan }) : loadActiveQuest(userId),
    loadInterviewContext(userId),
  ]);
  const { data: latestPlan } = planResult;
  const plan = selectedPlan ?? latestPlan;
  if (!plan) return `${interview}\nУ пользователя пока нет активной цели.`;
  const { context } = await loadQuestLearning(userId, plan.goal);
  return `${interview}\nЦель: ${plan.goal}. Текущий этап: ${plan.steps.find((step) => step.state === 'active')?.title || 'не выбран'}.
Результаты прошлых заданий: ${context || 'пока нет'}.`;
}

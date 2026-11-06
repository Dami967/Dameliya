import { reviewSourceKey } from './reviewSource';
import { supabase } from './supabase';
import { askAi, parseAiJson } from './ai';
import type { AiQuestPlan } from './aiQuest';
import type { QuestStep } from './questData';
import { loadSettings } from './userProfile';
import { languageName } from './languages';
import { standaloneTaskRules } from './taskLesson';

export type ReviewQuestion = { source_key?: string; question: string; options: string[]; correct: number; explanation: string };
export type QuestReview = { plan_id: string; step_id: number; questions: ReviewQuestion[];
  best_score: number | null; attempts: number; completed_at: string | null; reward_id: string | null };

export function validReview(value: unknown): value is ReviewQuestion[] {
  if (!Array.isArray(value) || value.length !== 5) return false;
  return value.every((question) => question && typeof question.question === 'string' && question.question.trim()
    && Array.isArray(question.options) && question.options.length === 4
    && question.options.every((option: unknown) => typeof option === 'string' && option.trim())
    && new Set(question.options).size === 4 && Number.isInteger(question.correct)
    && question.correct >= 0 && question.correct < 4
    && typeof question.explanation === 'string' && question.explanation.trim());
}

export async function prepareReview(userId: string, plan: AiQuestPlan, step: QuestStep, preview = false) {
  if (plan.user_id !== userId || !plan.steps.some((item) => item.id === step.id)) {
    throw new Error('Этап не относится к выбранной цели.');
  }
  if (step.state !== 'done' && !preview) throw new Error('Сначала выполни этот этап.');
  const { data: settings, error: settingsError } = await loadSettings(userId);
  if (settingsError) throw new Error('Не удалось загрузить язык из настроек.');
  const sourceKey = reviewSourceKey(plan, step, settings?.language ?? 'ru');
  const existing = await supabase.from('quest_reviews').select('*').eq('user_id', userId)
    .eq('plan_id', plan.id).eq('step_id', step.id).maybeSingle<QuestReview>();
  if (existing.error) throw new Error('Не удалось загрузить игру. Попробуй ещё раз.');
  if (existing.data && validReview(existing.data.questions)
    && existing.data.questions.every((question) => question.source_key === sourceKey)) return existing.data;
  const requestKey = `${userId}:${sourceKey}`;
  let pending = reviewRequests.get(requestKey);
  if (!pending) {
    pending = generateQuestions(plan, step, settings?.language ?? 'ru', sourceKey).catch((error: unknown) => {
      reviewRequests.delete(requestKey);
      throw error;
    });
    reviewRequests.set(requestKey, pending);
    if (reviewRequests.size > 20) reviewRequests.delete(reviewRequests.keys().next().value!);
  }
  const scopedQuestions = await pending;
  if (preview) return { plan_id: plan.id, step_id: step.id, questions: scopedQuestions, best_score: null,
    attempts: 0, completed_at: null, reward_id: null } satisfies QuestReview;
  const saved = existing.data
    ? await supabase.from('quest_reviews').update({ questions: scopedQuestions }).eq('user_id', userId)
      .eq('plan_id', plan.id).eq('step_id', step.id)
    : await supabase.from('quest_reviews').upsert({ user_id: userId, plan_id: plan.id,
      step_id: step.id, questions: scopedQuestions }, { onConflict: 'user_id,plan_id,step_id', ignoreDuplicates: true });
  if (saved.error) throw new Error('Не удалось сохранить игру. Попробуй снова.');
  const loaded = await supabase.from('quest_reviews').select('*').eq('user_id', userId)
    .eq('plan_id', plan.id).eq('step_id', step.id).single<QuestReview>();
  if (loaded.error) throw loaded.error;
  return loaded.data;
}

const reviewRequests = new Map<string, Promise<ReviewQuestion[]>>();

async function generateQuestions(plan: AiQuestPlan, step: QuestStep, language: string, sourceKey: string) {
  const result = await askAi(`Цель: ${plan.goal}. Пройденный этап: ${step.title}.
Материал именно этого этапа: ${JSON.stringify(step.details)}.
Единственная цель для этой игры — «${plan.goal}», выбранная на текущей карте ${plan.id}.
Не используй другие цели пользователя, общие вопросы или темы из соседних этапов.
Викторина и карточки используют один и тот же набор вопросов по этому материалу.
Создай 5 коротких вопросов для закрепления именно этого этапа. Для каждого 4 правдоподобных разных варианта,
ровно один правильный. Проверь правильность решений. Не включай новые темы и вопросы о других языках.
Верни JSON: {"questions":[{"question":"условие","options":["A","B","C","D"],"correct":0,"explanation":"почему верно"}]}.
correct — индекс от 0 до 3.`, `${standaloneTaskRules} Все вопросы, варианты и объяснения пиши на языке ${languageName(language)}. Только валидный JSON.`, [], false, true);
  if (result.error) throw result.error;
  const { questions } = parseAiJson<{ questions: unknown }>(result.text ?? '');
  if (!validReview(questions)) throw new Error('Кью не смог подготовить полную викторину. Попробуй снова.');
  return questions.map((question) => ({ ...question, source_key: sourceKey }));
}

export async function finishReview(planId: string, stepId: number, answers: number[]) {
  const result = await supabase.rpc('finish_quest_review', { target_plan: planId, target_step: stepId, selected_answers: answers });
  if (result.error) throw new Error('Результат пока не сохранён. Нажми «Сохранить результат» ещё раз.');
  window.dispatchEvent(new Event('quest-progress-changed'));
  return Number(result.data);
}

export async function loadReviews(userId: string, planId: string) {
  return supabase.from('quest_reviews').select('*').eq('user_id', userId).eq('plan_id', planId).returns<QuestReview[]>();
}

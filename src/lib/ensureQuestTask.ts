import { taskNeedsTranslation, translateTask } from './translateTask';
import { loadInterviewContext } from './interviewContext';
import { askAi, parseAiJson } from './ai';
import type { AiQuestPlan } from './aiQuest';
import type { QuestStep, QuestTaskDetails } from './questData';
import { normalizeDetails, normalizeQuestStep } from './questDetails';
import { loadQuestLearning } from './questLearning';
import { loadSettings } from './userProfile';
import { languageName } from './languages';
import { degreeFallbackLesson, isTaskLesson, lessonSchema, standaloneTaskRules } from './taskLesson';
import { supabase } from './supabase';
import { verifyDetailsResources, videoInLanguage, youtubeEmbed } from './questVideos';

export async function saveUpdatedStep(userId: string, plan: AiQuestPlan, step: QuestStep) {
  const steps = plan.steps.map((item) => item.id === step.id ? step : item);
  return supabase.from('ai_quest_plans').update({ steps, updated_at: new Date().toISOString() })
    .eq('user_id', userId).eq('id', plan.id);
}

export async function ensureQuestTaskDetails(userId: string, plan: AiQuestPlan, stepId: number) {
  const step = plan.steps.find((item) => item.id === stepId);
  if (!step) return { data: null, error: new Error('Задание не найдено.') };
  const { data: settings, error: settingsError } = await loadSettings(userId);
  if (settingsError || !settings) throw new Error('Не удалось загрузить язык из настроек. Попробуй снова.');
  const language = settings.language;
  if (isTaskLesson(step.details?.lesson)) {
    if (taskNeedsTranslation(step, language)) {
      const updated = await translateTask(step, language, plan.goal);
      const saved = await saveUpdatedStep(userId, plan, updated);
      return { data: updated, error: saved.error };
    }
    return { data: normalizeQuestStep(step), error: null };
  }
  const [{ context: learning }, interview] = await Promise.all([
    loadQuestLearning(userId, plan.goal), loadInterviewContext(userId),
  ]);
  const result = await askAi(
    `Цель: ${plan.goal}. Текущий этап: ${step.title}. Ожидаемый результат: ${step.subtitle}.
Исходное задание: ${step.details?.objective ?? ''}. Сохрани тему этого этапа.
${interview}
Обязательно адаптируй сложность к уровню, возрасту, трудностям, занятию и доступному времени из анкеты. Используй интересы для понятных примеров, сохраняя тему цели. Не выдумывай сведения о пользователе.
Результаты прошлых этапов: ${learning || 'нет'}. Не повторяй освоенное.
Создай полноценный урок внутри приложения.
Верни JSON: {"objective":"что изучим здесь","expected_answer":"эталон для проверки",
"duration_minutes":25,"category":"Практика","checklist":[{"title":"шаг","hint":"как выполнить здесь"}],"resources":[]}.
В checklist ровно 3 пункта. ${lessonSchema}`,
    `Ты создаёшь задания для пользователя с учётом его анкеты. Пиши на языке ${languageName(settings?.language ?? 'ru')}.
${standaloneTaskRules} Только валидный JSON.`, [], false, true,
  );
  if (result.error) return recoverDegreeLesson(userId, plan, step, result.error);
  try {
    const generated = parseAiJson<QuestTaskDetails>(result.text ?? '');
    if (!isTaskLesson(generated.lesson)) throw new Error('Неполный урок');
    const details = normalizeDetails(generated, step.subtitle);
    if (!details.lesson) throw new Error('Неполный урок');
    const candidate = { ...step, details };
    const updated = taskNeedsTranslation(candidate, language)
      ? await translateTask(candidate, language, plan.goal)
      : { ...candidate, details: { ...details, language } };
    const saved = await saveUpdatedStep(userId, plan, updated);
    return { data: updated, error: saved.error };
  } catch {
    return recoverDegreeLesson(userId, plan, step, new Error('Кью не смог подготовить полный урок.'));
  }
}

async function recoverDegreeLesson(userId: string, plan: AiQuestPlan, step: QuestStep, error: Error) {
  const lesson = degreeFallbackLesson(step.title);
  if (!lesson) return { data: step, error };
  const updated = { ...step, details: normalizeDetails({
    objective: 'Пойми, что такое степень, и научись записывать произведение одинаковых множителей.',
    expected_answer: 'Выполненные пять упражнений по степеням.', duration_minutes: 25,
    category: 'Практика', checklist: [
      { title: 'Изучи объяснение здесь', hint: 'Разбери основание и показатель степени.' },
      { title: 'Разбери приведённые примеры', hint: 'Сопоставь произведение и запись степени.' },
      { title: 'Ответь на 5 упражнений здесь', hint: 'Выполни упражнения последовательно.' },
    ], lesson, resources: [],
  }, step.subtitle) };
  const saved = await saveUpdatedStep(userId, plan, updated);
  return { data: updated, error: saved.error };
}

export async function ensureTaskVideo(userId: string, plan: AiQuestPlan, step: QuestStep, persist = true) {
  const details = step.details;
  if (!details) return { data: step, error: null };
  const { data: settings } = await loadSettings(userId);
  const language = settings?.language ?? 'ru';
  const topic = `Цель: ${plan.goal}. Задание: ${step.title}. ${details.objective}`;
  if (details.resources.some((item) => item.type === 'video'
    && videoInLanguage(item, language) && youtubeEmbed(item.url))) {
    return { data: step, error: null };
  }
  const verified = await verifyDetailsResources(details, topic);
  const updated = { ...step, details: verified };
  if (!persist) return { data: updated, error: null };
  const saved = await saveUpdatedStep(userId, plan, updated);
  return { data: updated, error: saved.error };
}

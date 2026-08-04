import { supabase } from './supabase';
import type { QuestResource, QuestStep, QuestTaskDetails } from './questData';
import { askAi, parseAiJson, searchYoutubeVideo, validateYoutubeVideo } from './ai';
import { loadProfile, loadSettings } from './userProfile';
import { loadQuestLearning } from './questLearning';
import { cacheQuestPlans } from './questCache';
import { languageName } from './languages';

export type AiQuestPlan = {
  id: string;
  user_id: string;
  goal: string;
  map_title: string;
  steps: QuestStep[];
  insight?: string;
  insights?: QuestInsight[];
  updated_at: string;
};

export type QuestInsight = { step_id: number; title: string; note: string };

export async function loadAiQuest(userId: string) {
  return supabase.from('ai_quest_plans').select('*').eq('user_id', userId)
    .order('updated_at', { ascending: false }).limit(1).maybeSingle<AiQuestPlan>();
}

export async function loadAiQuestById(userId: string, planId: string) {
  return supabase.from('ai_quest_plans').select('*').eq('user_id', userId)
    .eq('id', planId).maybeSingle<AiQuestPlan>();
}

export async function loadAiQuests(userId: string) {
  const result = await supabase.from('ai_quest_plans').select('*').eq('user_id', userId)
    .order('created_at', { ascending: true }).returns<AiQuestPlan[]>();
  if (!result.error && result.data) cacheQuestPlans(userId, result.data);
  return result;
}

export function deleteAiQuest(planId: string) {
  return supabase.rpc('delete_quest_plan', { target_id: planId });
}

export async function createAiQuest(userId: string, goal: string, request: string, planId?: string) {
  const previous = planId ? await loadAiQuestById(userId, planId) : null;
  const [{ data: profile }, { data: settings }] = await Promise.all([loadProfile(userId), loadSettings(userId)]);
  const outputLanguage = languageName(settings?.language ?? 'ru');
  const profileContext = profile ? `Возраст: ${profile.age || 'не указан'}. Интересы: ${profile.interests.join(', ') || 'не указаны'}.
Сильные стороны: ${profile.strengths || 'не указаны'}. Трудности: ${profile.challenges || 'не указаны'}.
Доступно времени в день: ${profile.daily_minutes} минут.` : '';
  const { text, error } = await askAi(
    `Цель пользователя: ${goal}. Пожелание: ${request || 'Создай понятный маршрут'}. ${profileContext}
Верни ТОЛЬКО JSON без markdown: {"map_title":"короткое название","steps":[{"title":"действие","subtitle":"результат этапа","objective":"подробное персональное задание","expected_answer":"эталон готового правильного результата для проверки","duration_minutes":25,"category":"тип задания","checklist":[{"title":"конкретный шаг","hint":"как его выполнить"}],"resources":[{"type":"video","title":"название","url":"https://www.youtube.com/watch?v=ID","description":"зачем смотреть"}]}]}.
Ровно 10 конкретных, безопасных и выполнимых этапов. В каждом этапе ровно 3 пункта checklist и 0–2 полезных ресурса.
Статьи и тесты создаются внутри GoalQuest: для них укажи url "goalquest://material" и не предлагай внешний сайт.
Только для видео выбирай существующий ролик известного образовательного канала, доступный без входа. Не выдумывай video ID и не указывай платные материалы.`,
    `Ты создаёшь персональные карты GoalQuest для подростков. Весь пользовательский текст пиши на языке ${outputLanguage}. Отвечай только валидным JSON.`,
    [], false, true,
  );
  if (error) return { data: null, error };
  try {
    const parsed = parseAiJson<{
      map_title: string;
      steps: Array<{ title: string; subtitle: string } & QuestTaskDetails>;
    }>(text ?? '');
    const steps: QuestStep[] = parsed.steps.slice(0, 10).map((step, index) => ({
      id: index + 1,
      title: step.title,
      subtitle: index === 0 ? 'Текущее задание' : step.subtitle,
      state: index === 0 ? 'active' : 'locked',
      xp: 50 + index * 30,
      icon: index === 9 ? 'rocket' : index % 3 === 0 ? 'sparkles' : 'book',
      details: normalizeDetails(step, step.subtitle),
    }));
    if (steps.length !== 10) throw new Error('AI returned an incomplete plan');
    const values = {
      user_id: userId, goal, map_title: parsed.map_title, steps,
      insight: `Главное сейчас — начать с этапа «${steps[0].title}» и сохранить конкретный результат.`,
      updated_at: new Date().toISOString(),
    };
    if (planId) {
      const updated = await supabase.from('ai_quest_plans').update({ ...values, insights: [] })
        .eq('user_id', userId).eq('id', planId).select().single<AiQuestPlan>();
      if (!updated.error && previous?.data) {
        await supabase.from('quest_task_records').delete().eq('user_id', userId).eq('goal', previous.data.goal);
      }
      return updated;
    }
    return supabase.from('ai_quest_plans').upsert(values, { onConflict: 'user_id,goal' })
      .select().single<AiQuestPlan>();
  } catch {
    return { data: null, error: new Error('AI не смог собрать карту. Попробуй ещё раз.') };
  }
}

export async function ensureQuestTaskDetails(userId: string, plan: AiQuestPlan, stepId: number) {
  const step = plan.steps.find((item) => item.id === stepId);
  if (!step) return { data: null, error: null };
  if (step.details) {
    const normalized = normalizeQuestStep(step);
    const details = normalized.details!;
    if (!requestsVideo(details)) {
      return { data: normalized, error: null };
    }
    const savedVideo = details.resources.find((item) => item.type === 'video');
    const belongsToStep = savedVideo?.description.includes(`Задание: ${step.title}`) ?? false;
    if (savedVideo && belongsToStep && await validateYoutubeVideo(savedVideo.url)) {
      return { data: normalized, error: null };
    }
    const usableResources = details.resources.filter((item) => item.type !== 'video');
    const video = await findVerifiedVideo(
      `${step.title}. ${details.objective}. Цель пользователя: ${plan.goal}`,
      savedVideo?.url ?? 'нет сохранённого видео',
    );
    if (!video) {
      const cleanedStep = { ...normalized, details: { ...details, resources: usableResources } };
      if (savedVideo) await saveUpdatedStep(userId, plan, cleanedStep);
      return { data: cleanedStep, error: null };
    }
    const taggedVideo = { ...video, description: `${video.description} Задание: ${step.title}` };
    const updatedStep = { ...normalized, details: { ...details, resources: [...usableResources, taggedVideo].slice(0, 3) } };
    await saveUpdatedStep(userId, plan, updatedStep);
    return { data: updatedStep, error: null };
  }
  const { context: learning } = await loadQuestLearning(userId, plan.goal);
  const [{ data: profile }, { data: settings }] = await Promise.all([loadProfile(userId), loadSettings(userId)]);
  const outputLanguage = languageName(settings?.language ?? 'ru');
  const context = profile ? `Интересы: ${profile.interests.join(', ')}. Сильные стороны: ${profile.strengths}.
Трудности: ${profile.challenges}. Доступно времени в день: ${profile.daily_minutes} минут.` : '';
  const result = await askAi(
    `Цель: ${plan.goal}. Этап: ${step.title}. Ожидаемый результат: ${step.subtitle}. ${context}
Данные из заметок и разговоров ВСЕХ пройденных этапов: ${learning || 'пройденных этапов пока нет'}.
Сначала определи подтверждённый уровень, пробелы, успехи и предпочтения. Создай задание именно под них.
Не проси повторно сообщить сведения, которые уже есть в данных. Не повторяй уже выполненное.
Верни ТОЛЬКО JSON без markdown: {"objective":"подробное персональное задание","expected_answer":"эталон готового правильного результата для проверки","duration_minutes":25,"category":"тип задания","checklist":[{"title":"конкретный шаг","hint":"как выполнить"}],"resources":[{"type":"video","title":"название","url":"https://www.youtube.com/watch?v=ID","description":"зачем нужен"}]}.
В checklist должно быть ровно 3 выполнимых пункта. Не добавляй ссылки в objective или checklist.
Статьи и тесты создаются внутри GoalQuest: для них используй url "goalquest://material". Только для видео выбирай существующий ролик известного образовательного канала, доступный без входа; не выдумывай video ID.`,
    `Ты создаёшь персональное задание GoalQuest для подростка. Пиши на языке ${outputLanguage}. Отвечай безопасно, конкретно и только валидным JSON.`,
    [], false, true,
  );
  if (result.error) return { data: { ...step, details: fallbackDetails(step) }, error: result.error };
  try {
    const generated = normalizeDetails(parseAiJson<QuestTaskDetails>(result.text ?? ''), step.subtitle);
    const details = await verifyDetailsResources(generated, `${plan.goal}: ${step.title}`);
    const updatedStep = { ...step, details };
    await saveUpdatedStep(userId, plan, updatedStep);
    return { data: updatedStep, error: null };
  } catch {
    return { data: { ...step, details: fallbackDetails(step) }, error: new Error('Не удалось адаптировать задание.') };
  }
}

function requestsVideo(details: QuestTaskDetails) {
  const text = `${details.objective} ${details.checklist.map((item) => `${item.title} ${item.hint}`).join(' ')}`;
  return /видео|video|youtube|прослушай/i.test(text);
}

async function saveUpdatedStep(userId: string, plan: AiQuestPlan, step: QuestStep) {
  const steps = plan.steps.map((item) => item.id === step.id ? step : item);
  await supabase.from('ai_quest_plans').update({ steps, updated_at: new Date().toISOString() })
    .eq('user_id', userId).eq('id', plan.id);
}

export function normalizeQuestStep(step: QuestStep): QuestStep {
  return { ...step, details: step.details ? normalizeDetails(step.details, step.subtitle) : fallbackDetails(step) };
}

function normalizeDetails(value: Partial<QuestTaskDetails>, fallback: string): QuestTaskDetails {
  const checklist = Array.isArray(value.checklist) ? value.checklist.slice(0, 3).map((item) => ({
    title: String(item.title || 'Выполни следующий шаг'),
    hint: String(item.hint || 'Сосредоточься на небольшом измеримом результате.'),
  })) : [];
  if (checklist.length !== 3) return fallbackDetails({ title: fallback, subtitle: fallback } as QuestStep);
  const explicitResources = Array.isArray(value.resources) ? value.resources.slice(0, 2).flatMap((resource, index) => {
    const type = resource.type;
    const url = String(resource.url || '');
    if (!['video', 'article', 'test'].includes(type)) return [];
    if (type === 'video' && !isSafeResourceUrl(url)) return [];
    return [{ type, title: String(resource.title || 'Полезный материал'),
      description: String(resource.description || ''),
      url: type === 'video' ? url : `goalquest://material/${index}` }] as QuestTaskDetails['resources'];
  }) : [];
  const text = `${value.objective || ''} ${checklist.map((item) => `${item.title} ${item.hint}`).join(' ')}`;
  const discovered = discoverResources(text, String(value.category || ''));
  return {
    objective: String(value.objective || fallback),
    expected_answer: String(value.expected_answer || `Готовый результат «${fallback}», подтверждающий выполнение всех пунктов.`),
    duration_minutes: Math.min(180, Math.max(5, Number(value.duration_minutes) || 25)),
    category: String(value.category || 'Практика'),
    checklist,
    resources: [...explicitResources, ...discovered.filter((item) =>
      !explicitResources.some((resource) => resource.url === item.url))].slice(0, 3),
  };
}

function fallbackDetails(step: QuestStep): QuestTaskDetails {
  return {
    objective: step.subtitle || `Выполни этап «${step.title}» и сохрани конкретный результат.`,
    expected_answer: `Конкретный результат этапа «${step.title}», подтверждающий выполнение всех трёх пунктов.`,
    duration_minutes: 25,
    category: 'Практика',
    resources: [],
    checklist: [
      { title: 'Определи результат', hint: `Запиши, что должно получиться после этапа «${step.title}».` },
      { title: 'Сделай основной шаг', hint: 'Выдели 20 минут и сосредоточься только на этой задаче.' },
      { title: 'Зафиксируй итог', hint: 'Сохрани результат и коротко запиши, что получилось.' },
    ],
  };
}

function isSafeResourceUrl(value: string) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function discoverResources(text: string, category: string): QuestResource[] {
  const urls = text.match(/https:\/\/[^\s<>"']+/gi) ?? [];
  return [...new Set(urls.map((url) => url.replace(/[),.;!?]+$/g, '')))]
    .filter(isSafeResourceUrl).map((url) => {
      const isVideo = /youtu\.?be/i.test(url);
      const isTest = /тест|test|quiz|диагност/i.test(`${category} ${text}`);
      return {
        type: isVideo ? 'video' : isTest ? 'test' : 'article',
        title: isVideo ? 'Видеоурок' : isTest ? 'Пройти тест' : 'Открыть материал',
        url,
        description: 'Материал, указанный Кью в задании.',
      };
    });
}

async function verifyDetailsResources(details: QuestTaskDetails, topic: string) {
  const resources: QuestResource[] = [];
  for (const resource of details.resources) {
    if (resource.type !== 'video') { resources.push(resource); continue; }
    if (await validateYoutubeVideo(resource.url)) { resources.push(resource); continue; }
    const replacement = await findVerifiedVideo(topic, resource.url);
    if (replacement) resources.push(replacement);
  }
  return { ...details, resources };
}

async function findVerifiedVideo(topic: string, unavailableUrl: string) {
  const query = `${topic} образовательный видеоурок`;
  const video = await searchYoutubeVideo(query);
  return video?.url === unavailableUrl ? null : video;
}

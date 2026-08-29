import { supabase } from './supabase';
import type { QuestResource, QuestStep, QuestTaskDetails } from './questData';
import { askAi, parseAiJson, searchYoutubeVideo } from './ai';
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

const VIDEO_VERSION_TAG = 'Проверено: video-v2';

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
  const planPrompt = `Цель пользователя: ${goal}. Пожелание: ${request || 'Создай понятный маршрут'}. ${profileContext}
Верни ТОЛЬКО JSON без markdown: {"map_title":"короткое название","steps":[{"title":"действие","subtitle":"результат этапа","objective":"подробное персональное задание","expected_answer":"эталон готового правильного результата для проверки","duration_minutes":25,"category":"тип задания","checklist":[{"title":"конкретный шаг","hint":"как его выполнить"}],"resources":[{"type":"video","title":"название","url":"https://www.youtube.com/watch?v=ID","description":"зачем смотреть"}]}]}.
Ровно 10 конкретных, безопасных и выполнимых этапов. В каждом этапе ровно 3 пункта checklist и 0–2 полезных ресурса.
Статьи и тесты создаются внутри GoalQuest: для них укажи url "goalquest://material" и не предлагай внешний сайт.
Только для видео выбирай существующий ролик известного образовательного канала, доступный без входа. Не выдумывай video ID и не указывай платные материалы.`;
  const planSystem = `Ты создаёшь персональные карты GoalQuest для подростков. Весь пользовательский текст пиши на языке ${outputLanguage}. Отвечай только валидным JSON.`;
  type GeneratedPlan = { map_title: string; steps: Array<{ title: string; subtitle: string } & QuestTaskDetails> };
  let result = await askAi(planPrompt, planSystem, [], false, true);
  if (result.error) return { data: null, error: result.error };
  let parsed: GeneratedPlan | null = null;
  for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
    try {
      const candidate = parseAiJson<GeneratedPlan>(result.text ?? '');
      if (!candidate.map_title || !Array.isArray(candidate.steps) || candidate.steps.length !== 10) throw new Error();
      parsed = candidate;
    } catch {
      if (attempt === 0) result = await askAi(`${planPrompt}\nПредыдущая попытка была неполной. Проверь перед ответом: steps содержит РОВНО 10 объектов, а checklist каждого объекта — РОВНО 3 разных пункта.`,
        planSystem, [], false, true);
    }
  }
  if (!parsed) return { data: null, error: result.error ?? new Error('AI не смог собрать карту после двух попыток.') };
  const steps: QuestStep[] = parsed.steps.map((step, index) => ({
    id: index + 1, title: String(step.title), subtitle: index === 0 ? 'Текущее задание' : String(step.subtitle),
    state: index === 0 ? 'active' : 'locked', xp: 50 + index * 30,
    icon: index === 9 ? 'rocket' : index % 3 === 0 ? 'sparkles' : 'book',
    details: normalizeDetails(step, String(step.subtitle)),
  }));
  const values = { user_id: userId, goal, map_title: parsed.map_title, steps,
    insight: `Главное сейчас — начать с этапа «${steps[0].title}» и сохранить конкретный результат.`,
    updated_at: new Date().toISOString() };
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
}

export async function ensureQuestTaskDetails(userId: string, plan: AiQuestPlan, stepId: number) {
  const step = plan.steps.find((item) => item.id === stepId);
  if (!step) return { data: null, error: null };
  if (step.details && !needsFreshDetails(step.details)) {
    const normalized = normalizeQuestStep(step);
    const details = normalized.details!;
    if (!requestsVideo(details)) {
      return { data: normalized, error: null };
    }
    const savedVideo = details.resources.find((item) => item.type === 'video');
    const usesCurrentSearch = savedVideo?.description.includes(VIDEO_VERSION_TAG) ?? false;
    if (savedVideo && usesCurrentSearch) {
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
    const taggedVideo = { ...video,
      description: `${video.description} Задание: ${step.title}. ${VIDEO_VERSION_TAG}` };
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

function needsFreshDetails(details: QuestTaskDetails) {
  if (!Array.isArray(details.checklist) || details.checklist.length !== 3) return true;
  const titles = details.checklist.map((item) => item.title.trim().toLocaleLowerCase());
  const hints = details.checklist.map((item) => item.hint.trim().toLocaleLowerCase());
  return titles.some((title) => !title || title === 'выполни следующий шаг')
    || new Set(titles).size < 3 || new Set(hints).size < 2;
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
  const implied = impliedResources(text);
  const discovered = discoverResources(text, String(value.category || ''));
  return {
    objective: String(value.objective || fallback),
    expected_answer: String(value.expected_answer || `Готовый результат «${fallback}», подтверждающий выполнение всех пунктов.`),
    duration_minutes: Math.min(180, Math.max(5, Number(value.duration_minutes) || 25)),
    category: String(value.category || 'Практика'),
    checklist,
    resources: [...explicitResources, ...implied, ...discovered].filter((resource, index, items) =>
      items.findIndex((item) => item.url === resource.url) === index).slice(0, 3),
  };
}

function impliedResources(text: string): QuestResource[] {
  if (!/тест|test|quiz|викторин|диагност/i.test(text)) return [];
  return [{ type: 'test', title: 'Диагностический тест', url: 'goalquest://material/test',
    description: 'Пять вопросов по теме задания с проверкой и объяснениями.' }];
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
    const replacement = await findVerifiedVideo(topic, resource.url);
    if (replacement) resources.push({ ...replacement,
      description: `${replacement.description} ${VIDEO_VERSION_TAG}` });
  }
  return { ...details, resources };
}

async function findVerifiedVideo(topic: string, unavailableUrl: string) {
  const query = `${topic} образовательный видеоурок`;
  const video = await searchYoutubeVideo(query);
  return video?.url === unavailableUrl ? null : video;
}

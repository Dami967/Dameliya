import { supabase } from './supabase';
import type { QuestResource, QuestStep, QuestTaskDetails } from './questData';
import { askAi, parseAiJson, validateYoutubeVideo } from './ai';
import { loadProfile } from './userProfile';
import { loadQuestLearning } from './questLearning';

export type AiQuestPlan = {
  id: string;
  user_id: string;
  goal: string;
  map_title: string;
  steps: QuestStep[];
  updated_at: string;
};

export async function loadAiQuest(userId: string) {
  return supabase.from('ai_quest_plans').select('*').eq('user_id', userId)
    .order('updated_at', { ascending: false }).limit(1).maybeSingle<AiQuestPlan>();
}

export async function loadAiQuestById(userId: string, planId: string) {
  return supabase.from('ai_quest_plans').select('*').eq('user_id', userId)
    .eq('id', planId).maybeSingle<AiQuestPlan>();
}

export async function loadAiQuests(userId: string) {
  return supabase.from('ai_quest_plans').select('*').eq('user_id', userId)
    .order('created_at', { ascending: true }).returns<AiQuestPlan[]>();
}

export async function createAiQuest(userId: string, goal: string, request: string) {
  const { text, error } = await askAi(
    `Цель пользователя: ${goal}. Пожелание: ${request || 'Создай понятный маршрут'}.
Верни ТОЛЬКО JSON без markdown: {"map_title":"короткое название","steps":[{"title":"действие","subtitle":"результат этапа","objective":"подробное персональное задание","duration_minutes":25,"category":"тип задания","checklist":[{"title":"конкретный шаг","hint":"как его выполнить"}],"resources":[{"type":"video","title":"название","url":"https://www.youtube.com/watch?v=ID","description":"зачем смотреть"}]}]}.
Ровно 10 конкретных, безопасных и выполнимых этапов. В каждом этапе ровно 3 пункта checklist и 0–2 полезных ресурса.
Если предлагаешь посмотреть урок, статью или пройти тест, обязательно добавь рабочую публичную https-ссылку в resources.
Для видео выбирай существующий ролик известного образовательного канала, доступный без входа. Не выдумывай video ID, адреса и не указывай платные материалы.`,
    'Ты создаёшь персональные карты GoalQuest для подростков. Отвечай только валидным JSON на русском языке.',
  );
  if (error) return { data: null, error };
  try {
    const parsed = parseAiJson<{
      map_title: string;
      steps: Array<{ title: string; subtitle: string } & QuestTaskDetails>;
    }>(text ?? '');
    const steps: QuestStep[] = await Promise.all(parsed.steps.slice(0, 10).map(async (step, index) => ({
      id: index + 1,
      title: step.title,
      subtitle: index === 0 ? 'Текущее задание' : step.subtitle,
      state: index === 0 ? 'active' : 'locked',
      xp: 50 + index * 30,
      icon: index === 9 ? 'rocket' : index % 3 === 0 ? 'sparkles' : 'book',
      details: await verifyDetailsResources(normalizeDetails(step, step.subtitle), `${goal}: ${step.title}`),
    })));
    if (steps.length !== 10) throw new Error('AI returned an incomplete plan');
    return supabase.from('ai_quest_plans').upsert({
      user_id: userId, goal, map_title: parsed.map_title, steps, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,goal' }).select().single<AiQuestPlan>();
  } catch {
    return { data: null, error: new Error('AI не смог собрать карту. Попробуй ещё раз.') };
  }
}

export async function ensureQuestTaskDetails(userId: string, plan: AiQuestPlan, stepId: number) {
  const step = plan.steps.find((item) => item.id === stepId);
  if (!step) return { data: null, error: null };
  const { context: learning } = await loadQuestLearning(userId, plan.goal);
  if (step.state === 'done' || (!learning && step.details && Array.isArray(step.details.resources))) {
    const normalized = normalizeQuestStep(step);
    const details = await verifyDetailsResources(normalized.details!, `${plan.goal}: ${step.title}`);
    const updatedStep = { ...normalized, details };
    await saveUpdatedStep(userId, plan, updatedStep);
    return { data: updatedStep, error: null };
  }
  const { data: profile } = await loadProfile(userId);
  const context = profile ? `Интересы: ${profile.interests.join(', ')}. Сильные стороны: ${profile.strengths}.
Трудности: ${profile.challenges}. Доступно времени в день: ${profile.daily_minutes} минут.` : '';
  const result = await askAi(
    `Цель: ${plan.goal}. Этап: ${step.title}. Ожидаемый результат: ${step.subtitle}. ${context}
Данные из заметок и разговоров ВСЕХ пройденных этапов: ${learning || 'пройденных этапов пока нет'}.
Сначала определи подтверждённый уровень, пробелы, успехи и предпочтения. Создай задание именно под них.
Не проси повторно сообщить сведения, которые уже есть в данных. Не повторяй уже выполненное.
Верни ТОЛЬКО JSON без markdown: {"objective":"подробное персональное задание","duration_minutes":25,"category":"тип задания","checklist":[{"title":"конкретный шаг","hint":"как выполнить"}],"resources":[{"type":"video","title":"название","url":"https://www.youtube.com/watch?v=ID","description":"зачем нужен"}]}.
В checklist должно быть ровно 3 выполнимых пункта. Если нужен урок или тест, обязательно добавь рабочую публичную https-ссылку.
Для видео выбирай существующий ролик известного образовательного канала, доступный без входа; не выдумывай video ID.`,
    'Ты создаёшь персональное задание GoalQuest для подростка. Отвечай безопасно, конкретно и только валидным JSON на русском.',
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
  const explicitResources = Array.isArray(value.resources) ? value.resources.slice(0, 2).flatMap((resource) => {
    const type = resource.type;
    const url = String(resource.url || '');
    if (!['video', 'article', 'test'].includes(type) || !isSafeResourceUrl(url)) return [];
    return [{ type, title: String(resource.title || 'Полезный материал'),
      description: String(resource.description || ''), url }] as QuestTaskDetails['resources'];
  }) : [];
  const text = `${value.objective || ''} ${checklist.map((item) => `${item.title} ${item.hint}`).join(' ')}`;
  const discovered = discoverResources(text, String(value.category || ''));
  return {
    objective: String(value.objective || fallback),
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
  let excluded = unavailableUrl;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await askAi(
      `Тема: ${topic}. Подбери существующий бесплатный YouTube-видеоурок, разрешённый для встраивания.
Не используй эти ссылки: ${excluded}. Верни только JSON: {"type":"video","title":"название","url":"https://www.youtube.com/watch?v=ID","description":"польза"}.`,
      'Ты подбираешь реальные образовательные видео. Не выдумывай video ID. Отвечай только JSON.',
    );
    try {
      const candidate = parseAiJson<QuestResource>(result.text ?? '');
      if (youtubeResource(candidate) && await validateYoutubeVideo(candidate.url)) return candidate;
      excluded += `, ${candidate.url}`;
    } catch { /* пробуем следующий вариант */ }
  }
  return null;
}

function youtubeResource(resource: QuestResource) {
  return resource.type === 'video' && isSafeResourceUrl(resource.url)
    && (resource.url.includes('youtube.com/') || resource.url.includes('youtu.be/'));
}

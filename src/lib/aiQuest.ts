import { loadInterviewContext } from './interviewContext';
import { supabase } from './supabase';
import type { QuestStep, QuestTaskDetails } from './questData';
import { askAi, parseAiJson } from './ai';
import { loadProfile, loadSettings } from './userProfile';
import { cacheQuestPlans } from './questCache';
import { languageName } from './languages';
import { normalizeDetails } from './questDetails';
import { standaloneTaskRules } from './taskLesson';
export { normalizeQuestStep } from './questDetails';
export { ensureQuestTaskDetails } from './ensureQuestTask';

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

export function questDisplayTitle(plan: AiQuestPlan) {
  return plan.map_title.trim() || plan.goal.trim();
}


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
  const outputLanguageCode = settings?.language ?? 'ru';
  const outputLanguage = languageName(outputLanguageCode);
  const profileContext = profile ? `Возраст: ${profile.age || 'не указан'}. Интересы: ${profile.interests.join(', ') || 'не указаны'}.
Сильные стороны: ${profile.strengths || 'не указаны'}. Трудности: ${profile.challenges || 'не указаны'}.
Доступно времени в день: ${profile.daily_minutes} минут.` : '';
  const interview = await loadInterviewContext(userId);
  const planPrompt = `Цель пользователя: ${goal}. Пожелание: ${request || 'Создай понятный маршрут'}. ${profileContext}
${interview}
Каждый этап учитывает возраст, занятие, уровень, трудности и время из анкеты. Примеры связывай с интересами, не меняя цель.
Верни ТОЛЬКО JSON без markdown: {"map_title":"короткое название","steps":[{"title":"действие","subtitle":"результат этапа","objective":"подробное персональное задание","expected_answer":"эталон готового правильного результата для проверки","duration_minutes":25,"category":"тип задания","checklist":[{"title":"конкретный шаг","hint":"как его выполнить"}],"resources":[{"type":"video","title":"название","url":"https://www.youtube.com/watch?v=ID","description":"зачем смотреть"}]}]}.
${standaloneTaskRules}
Ровно 10 конкретных, безопасных и выполнимых этапов. В каждом этапе ровно 3 пункта checklist и 0–2 полезных ресурса.
Статьи и тесты создаются внутри GoalQuest: для них укажи url "goalquest://material" и не предлагай внешний сайт.
Только для видео выбирай существующий ролик известного образовательного канала, доступный без входа. Не выдумывай video ID и не указывай платные материалы.`;
  const planSystem = `Ты создаёшь персональные карты GoalQuest для подростков. Весь пользовательский текст пиши на языке ${outputLanguage}. Переводи также название карты, этапы, задания и подписи ресурсов, даже если цель или анкета на другом языке. Язык изучаемого предмета не меняет язык объяснений. Отвечай только валидным JSON.`;
  type GeneratedPlan = { map_title: string; steps: Array<{ title: string; subtitle: string } & QuestTaskDetails> };
  let result = await askAi(planPrompt, planSystem, [], false, true);
  if (result.error) return { data: null, error: result.error };
  let parsed: GeneratedPlan | null = null;
  for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
    try {
      const candidate = parseAiJson<GeneratedPlan>(result.text ?? '');
      if (!candidate.map_title || !Array.isArray(candidate.steps) || candidate.steps.length !== 10) throw new Error();
      if (outputLanguageCode === 'ru' && !/[а-яё]/i.test(candidate.map_title)) throw new Error();
      parsed = candidate;
    } catch {
      if (attempt === 0) result = await askAi(`${planPrompt}\nПредыдущая попытка была неполной или на неверном языке. Все названия и объяснения должны быть на языке ${outputLanguage}, независимо от языка анкеты и примеров. Проверь перед ответом: steps содержит РОВНО 10 объектов, а checklist каждого объекта — РОВНО 3 разных пункта.`,
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

import { supabase } from './supabase';
import type { QuestStep } from './questData';
import { askAi, parseAiJson } from './ai';

export type AiQuestPlan = {
  user_id: string;
  goal: string;
  map_title: string;
  steps: QuestStep[];
  updated_at: string;
};

export async function loadAiQuest(userId: string) {
  return supabase.from('ai_quest_plans').select('*').eq('user_id', userId).maybeSingle<AiQuestPlan>();
}

export async function createAiQuest(userId: string, goal: string, request: string) {
  const { text, error } = await askAi(
    `Цель пользователя: ${goal}. Пожелание: ${request || 'Создай понятный маршрут'}.
Верни ТОЛЬКО JSON без markdown: {"map_title":"короткое название","steps":[{"title":"действие","subtitle":"короткое пояснение"}]}.
Ровно 10 конкретных, безопасных и выполнимых шагов. Каждый шаг должен помогать именно этой цели.`,
    'Ты создаёшь персональные карты GoalQuest для подростков. Отвечай только валидным JSON на русском языке.',
  );
  if (error) return { data: null, error };
  try {
    const parsed = parseAiJson<{
      map_title: string;
      steps: Array<{ title: string; subtitle: string }>;
    }>(text ?? '');
    const steps: QuestStep[] = parsed.steps.slice(0, 10).map((step, index) => ({
      id: index + 1,
      title: step.title,
      subtitle: index === 0 ? 'Текущее задание' : step.subtitle,
      state: index === 0 ? 'active' : 'locked',
      xp: 50 + index * 30,
      icon: index === 9 ? 'rocket' : index % 3 === 0 ? 'sparkles' : 'book',
    }));
    if (steps.length !== 10) throw new Error('AI returned an incomplete plan');
    return supabase.from('ai_quest_plans').upsert({
      user_id: userId, goal, map_title: parsed.map_title, steps, updated_at: new Date().toISOString(),
    }).select().single<AiQuestPlan>();
  } catch {
    return { data: null, error: new Error('AI не смог собрать карту. Попробуй ещё раз.') };
  }
}

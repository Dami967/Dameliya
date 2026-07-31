import { askAi, parseAiJson } from './ai';
import type { AiQuestPlan, QuestInsight } from './aiQuest';
import { supabase } from './supabase';
import type { TaskRecord } from './taskRecords';

export async function ensureQuestInsights(userId: string, plan: AiQuestPlan) {
  const completed = plan.steps.filter((step) => step.state === 'done');
  const existing = plan.insights ?? [];
  const missing = completed.filter((step) => !existing.some((item) => item.step_id === step.id));
  if (!missing.length) return { data: existing, error: null };

  const records = await supabase.from('quest_task_records').select('*').eq('user_id', userId)
    .eq('goal', plan.goal).in('step_id', missing.map((step) => step.id)).returns<TaskRecord[]>();
  const lessons = missing.map((step) => {
    const record = records.data?.find((item) => item.step_id === step.id);
    return {
      step_id: step.id,
      title: step.title,
      notes: record?.notes.slice(0, 5000) || '',
      conversation: record?.chat.slice(-20) || [],
    };
  });
  const result = await askAi(
    `Цель: ${plan.goal}. Данные завершённых уроков: ${JSON.stringify(lessons)}.
Для каждого урока выдели одну самую важную конкретную мысль пользователя из его заметок и разговора.
Не пиши общих советов и не придумывай факты. Если данных мало, честно назови зафиксированный результат.
Верни только JSON: {"insights":[{"step_id":1,"title":"название этапа","note":"главная конкретная мысль"}]}.`,
    'Ты ведёшь краткую память обучения GoalQuest. Пиши на русском, конкретно и только валидный JSON.',
  );
  if (result.error) return { data: existing, error: result.error };
  try {
    const parsed = parseAiJson<{ insights: QuestInsight[] }>(result.text ?? '');
    const additions = parsed.insights.filter((item) => missing.some((step) => step.id === item.step_id))
      .map((item) => ({ step_id: item.step_id, title: String(item.title), note: String(item.note).slice(0, 1000) }));
    const insights = [...existing, ...additions].sort((a, b) => a.step_id - b.step_id);
    const saved = await supabase.from('ai_quest_plans').update({ insights })
      .eq('user_id', userId).eq('id', plan.id);
    return { data: insights, error: saved.error };
  } catch {
    return { data: existing, error: new Error('Кью попробует выделить главную мысль позже.') };
  }
}

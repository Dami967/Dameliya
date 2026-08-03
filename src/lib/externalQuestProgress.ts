import { askAi, parseAiJson } from './ai';
import type { AiQuestPlan } from './aiQuest';
import { loadInterviewContext } from './interviewContext';
import { loadQuestLearning } from './questLearning';
import type { QuestStep, QuestTaskDetails } from './questData';
import { supabase } from './supabase';

type GeneratedStep = { title: string; subtitle: string } & QuestTaskDetails;

export async function adaptFromExternalProgress(userId: string, plan: AiQuestPlan, update: string) {
  const saved = await supabase.from('external_quest_progress').insert({
    user_id: userId, plan_id: plan.id, goal: plan.goal, content: update.trim(),
  }).select('id').single<{ id: string }>();
  if (saved.error) return { data: null, reply: '', error: saved.error };

  const completed = plan.steps.filter((step) => step.state === 'done');
  const remaining = plan.steps.filter((step) => step.state !== 'done');
  const templates = remaining.length ? remaining : nextLevel(plan.steps);
  const [{ context }, interview] = await Promise.all([
    loadQuestLearning(userId, plan.goal), loadInterviewContext(userId),
  ]);
  const result = await askAi(`${interview}
ГЛАВНАЯ ЦЕЛЬ И ТЕКУЩАЯ КАРТА: ${plan.goal} — ${plan.map_title}.
Пользователь самостоятельно сделал вне приложения: ${update.trim()}
Вся сохранённая история: ${context}.
Перестрой ${templates.length} текущих и будущих этапов. Не предлагай повторять то, что пользователь уже сделал.
Сохрани направление только этой цели и повысь сложность там, где уже есть подтверждённый прогресс.
Верни только JSON: {"reply":"коротко отметь прогресс и объясни, что изменилось","summary":"что уже освоено",
"steps":[{"title":"действие","subtitle":"результат","objective":"задание","expected_answer":"эталон результата",
"duration_minutes":25,"category":"тип","checklist":[{"title":"шаг","hint":"как сделать"}]}]}.
Верни ровно ${templates.length} этапов и ровно 3 пункта checklist в каждом.`,
  'Ты адаптивный наставник GoalQuest. Не смешивай эту карту с другими целями. Только валидный JSON на русском.',
  [], false, true);
  if (result.error) return { data: null, reply: '', error: result.error };
  try {
    const parsed = parseAiJson<{ reply: string; summary: string; steps: GeneratedStep[] }>(result.text ?? '');
    if (!Array.isArray(parsed.steps) || parsed.steps.length !== templates.length) throw new Error('Incomplete route');
    const future = parsed.steps.map((item, index) => toStep(templates[index], item, index === 0));
    const steps = [...completed, ...future].sort((a, b) => a.id - b.id);
    const updated = await supabase.from('ai_quest_plans').update({ steps,
      insight: String(parsed.summary || parsed.reply).slice(0, 1000), updated_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('id', plan.id).select('*').single<AiQuestPlan>();
    await supabase.from('external_quest_progress').update({ ai_summary: String(parsed.summary || '') })
      .eq('id', saved.data.id).eq('user_id', userId);
    return { data: updated.data, reply: String(parsed.reply || 'Карта адаптирована под новый прогресс.'), error: updated.error };
  } catch { return { data: null, reply: '', error: new Error('Кью сохранил прогресс, но не смог перестроить карту. Попробуй ещё раз.') }; }
}

function nextLevel(steps: QuestStep[]) {
  const start = Math.max(...steps.map((step) => step.id), 0) + 1;
  return Array.from({ length: 10 }, (_, index): QuestStep => ({ id: start + index,
    title: `Новый этап ${start + index}`, subtitle: 'Продолжение пути', state: 'locked',
    xp: 120 + index * 20, icon: index === 9 ? 'rocket' : 'book' }));
}

function toStep(template: QuestStep, value: GeneratedStep, active: boolean): QuestStep {
  const checklist = Array.isArray(value.checklist) ? value.checklist.slice(0, 3).map((item) => ({
    title: String(item.title || 'Выполни шаг'), hint: String(item.hint || 'Зафиксируй результат.'),
  })) : [];
  if (checklist.length !== 3) throw new Error('Invalid checklist');
  return { ...template, title: String(value.title || template.title),
    subtitle: active ? 'Текущее задание' : String(value.subtitle || template.subtitle),
    state: active ? 'active' : 'locked', details: {
      objective: String(value.objective || value.subtitle), expected_answer: String(value.expected_answer || value.subtitle),
      duration_minutes: Math.min(180, Math.max(5, Number(value.duration_minutes) || 25)),
      category: String(value.category || 'Персональная практика'), checklist, resources: [],
    } };
}

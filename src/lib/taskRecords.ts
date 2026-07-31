import { supabase } from './supabase';
import type { AiQuestPlan } from './aiQuest';

export type TaskChatMessage = { role: 'q' | 'user'; text: string };
export type TaskRecord = {
  id: string; user_id: string; goal: string; step_id: number; notes: string;
  chat: TaskChatMessage[]; status: 'active' | 'done'; attempts: number;
  completed_at: string | null; updated_at: string;
};

export function loadTaskRecord(userId: string, goal: string, stepId: number) {
  return supabase.from('quest_task_records').select('*').eq('user_id', userId)
    .eq('goal', goal).eq('step_id', stepId).maybeSingle<TaskRecord>();
}

export function saveTaskRecord(userId: string, goal: string, stepId: number,
  changes: Partial<Pick<TaskRecord, 'notes' | 'chat' | 'status' | 'attempts' | 'completed_at'>>) {
  return supabase.from('quest_task_records').upsert({
    user_id: userId, goal, step_id: stepId, ...changes, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,goal,step_id' }).select('*').single<TaskRecord>();
}

export async function completeQuestTask(userId: string, plan: AiQuestPlan, stepId: number,
  notes: string, chat: TaskChatMessage[]) {
  const current = plan.steps.find((step) => step.id === stepId);
  const steps = plan.steps.map((step) => {
    if (step.id === stepId) return { ...step, state: 'done' as const, subtitle: 'Выполнено' };
    if (current?.state === 'active' && step.id === stepId + 1) {
      return { ...step, state: 'active' as const, subtitle: 'Текущее задание' };
    }
    return step;
  });
  const [record, quest] = await Promise.all([
    saveTaskRecord(userId, plan.goal, stepId, {
      notes, chat, status: 'done', completed_at: new Date().toISOString(),
    }),
    supabase.from('ai_quest_plans').update({ steps }).eq('user_id', userId).eq('id', plan.id),
  ]);
  if (!record.error && current?.state !== 'done') {
    await Promise.all([
      supabase.rpc('add_challenge_score', { points: current?.xp ?? 50 }),
      supabase.rpc('award_task_progress', { points: current?.xp ?? 50 }),
    ]);
    window.dispatchEvent(new Event('profile-stats-changed'));
  }
  return { error: record.error ?? quest.error };
}

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

export async function completeQuestTask(plan: AiQuestPlan, stepId: number,
  notes: string, chat: TaskChatMessage[]) {
  const result = await supabase.rpc('complete_quest_task', {
    target_plan: plan.id, target_step: stepId, task_notes: notes, task_chat: chat,
  }).single<{ newly_completed: boolean; awarded_xp: number }>();
  if (!result.error && result.data?.newly_completed) {
    window.dispatchEvent(new Event('profile-stats-changed'));
  }
  return result;
}

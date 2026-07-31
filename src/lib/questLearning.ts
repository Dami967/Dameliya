import { supabase } from './supabase';
import type { TaskRecord } from './taskRecords';

export type QuestLearning = {
  step: number;
  notes: string;
  conversation: Array<{ speaker: 'Пользователь' | 'Кью'; text: string }>;
};

export async function loadQuestLearning(userId: string, goal: string) {
  const result = await supabase.from('quest_task_records').select('*').eq('user_id', userId)
    .eq('goal', goal).eq('status', 'done').order('step_id').returns<TaskRecord[]>();
  const learning: QuestLearning[] = (result.data ?? []).map((record) => ({
    step: record.step_id,
    notes: record.notes.trim().slice(0, 5000),
    conversation: record.chat.slice(-20).map((message) => ({
      speaker: message.role === 'user' ? 'Пользователь' as const : 'Кью' as const,
      text: message.text.slice(0, 1200),
    })),
  })).filter((item) => item.notes || item.conversation.length);
  return { learning, context: JSON.stringify(learning).slice(0, 18_000), error: result.error };
}

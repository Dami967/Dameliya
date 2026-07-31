import { supabase } from './supabase';
import type { TaskRecord } from './taskRecords';

export type QuestLearning = {
  step: number;
  notes: string;
  conversation: Array<{ speaker: 'Пользователь' | 'Кью'; text: string }>;
};

export async function loadQuestLearning(userId: string, goal: string) {
  const [result, actions] = await Promise.all([
    supabase.from('quest_task_records').select('*').eq('user_id', userId)
      .eq('goal', goal).eq('status', 'done').order('step_id').returns<TaskRecord[]>(),
    supabase.from('momentum_actions').select('kind,content,ai_analysis,created_at')
      .eq('user_id', userId).not('content', 'is', null).order('created_at', { ascending: false }).limit(20),
  ]);
  const learning: QuestLearning[] = (result.data ?? []).map((record) => ({
    step: record.step_id,
    notes: record.notes.trim().slice(0, 5000),
    conversation: record.chat.slice(-20).map((message) => ({
      speaker: message.role === 'user' ? 'Пользователь' as const : 'Кью' as const,
      text: message.text.slice(0, 1200),
    })),
  })).filter((item) => item.notes || item.conversation.length);
  const momentumLearning = (actions.data ?? []).map((action) => ({
    type: action.kind === 'quiz' ? 'Персональная викторина' : 'Отчёт о прогрессе',
    content: action.content,
    ai_analysis: action.ai_analysis,
  }));
  return {
    learning,
    context: JSON.stringify({ completedTasks: learning, quizzesAndReports: momentumLearning }).slice(0, 18_000),
    error: result.error ?? actions.error,
  };
}

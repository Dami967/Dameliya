import { supabase } from './supabase';
import { askAi, parseAiJson } from './ai';

export type TeamStage = {
  id: string; goal_id: string; position: number; title: string; description: string;
  notes: string; materials: { label: string; url: string }[]; status: 'pending' | 'done';
  completed_by: string | null; updated_at: string;
};
export type TeamGoal = { id: string; team_id: string; title: string; description: string; progress: number };
export type TeamHistory = {
  id: string; actor_id: string; summary: string; created_at: string; undone_at: string | null;
};
export type TeamProposal = {
  id: string; goal_id: string; stage_id: string | null; author_id: string;
  kind: 'add' | 'edit' | 'delete'; summary: string; payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected'; created_at: string;
};

export async function loadTeamQuest(teamId: string) {
  const goalResult = await supabase.from('team_goals').select('*').eq('team_id', teamId)
    .order('created_at').limit(1).maybeSingle<TeamGoal>();
  if (!goalResult.data) return { goal: null, stages: [], history: [], proposals: [], actorNames: {}, error: goalResult.error };
  const goalId = goalResult.data.id;
  const [stages, history, proposals] = await Promise.all([
    supabase.from('team_goal_stages').select('*').eq('goal_id', goalId).order('position').returns<TeamStage[]>(),
    supabase.from('team_goal_history').select('*').eq('goal_id', goalId).order('created_at', { ascending: false }).limit(20).returns<TeamHistory[]>(),
    supabase.from('team_goal_proposals').select('*').eq('goal_id', goalId).order('created_at', { ascending: false }).returns<TeamProposal[]>(),
  ]);
  const actorIds = [...new Set((history.data ?? []).map((item) => item.actor_id))];
  const actors = actorIds.length
    ? await supabase.from('public_profiles').select('user_id,display_name').in('user_id', actorIds)
      .returns<{ user_id: string; display_name: string }[]>()
    : { data: [] };
  const actorNames = Object.fromEntries((actors.data ?? []).map((actor) => [actor.user_id, actor.display_name]));
  return { goal: goalResult.data, stages: stages.data ?? [], history: history.data ?? [],
    proposals: proposals.data ?? [], actorNames, error: stages.error ?? history.error ?? proposals.error };
}

export async function createTeamQuest(teamId: string, userId: string, title: string, description: string) {
  const result = await supabase.from('team_goals').insert({
    team_id: teamId, creator_id: userId, title, description,
  }).select('*').single<TeamGoal>();
  if (result.error || !result.data) return result;
  const generated = await generateTeamStages(title, description);
  const stages = generated.map((stage, position) => ({
    goal_id: result.data.id, position, title: stage.title, description: stage.description, created_by: userId,
  }));
  const stageResult = await supabase.from('team_goal_stages').insert(stages);
  return { data: result.data, error: stageResult.error };
}

async function generateTeamStages(title: string, description: string) {
  const result = await askAi(
    `Общая цель команды: ${title}\nОписание результата: ${description || 'нет'}.
Верни ТОЛЬКО JSON без markdown: {"stages":[{"title":"короткое действие","description":"что именно делает команда"}]}.
Создай 6 последовательных, конкретных этапов. Этапы должны распределяться между людьми и вести к измеримому результату.`,
    `Ты проектный AI-наставник GoalQuest. Создавай безопасный и реалистичный командный квест на русском языке.
Не добавляй вымышленные достижения. Отвечай только валидным JSON.`,
  );
  if (result.text) {
    try {
      const parsed = parseAiJson<{ stages: Array<{ title: string; description: string }> }>(result.text);
      if (parsed.stages.length >= 4) return parsed.stages.slice(0, 8);
    } catch { /* используем надёжный запасной план */ }
  }
  return [
    { title: 'Уточнить общий результат', description: 'Согласуйте, как выглядит успешное завершение цели.' },
    { title: 'Распределить ответственность', description: 'Назначьте владельца и срок для каждого блока работы.' },
    { title: 'Собрать план действий', description: 'Разбейте путь на небольшие проверяемые задачи.' },
    { title: 'Выполнить основную работу', description: 'Двигайтесь по плану и отмечайте общий прогресс.' },
    { title: 'Проверить результат', description: 'Соберите обратную связь и исправьте недочёты.' },
    { title: 'Подвести итоги', description: 'Зафиксируйте результат и вклад участников.' },
  ];
}

export function subscribeTeamQuest(goalId: string, refresh: () => void) {
  const channel = supabase.channel(`team-quest-${goalId}`);
  for (const table of ['team_goals', 'team_goal_stages', 'team_goal_history', 'team_goal_proposals']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table,
      filter: table === 'team_goals' ? `id=eq.${goalId}` : `goal_id=eq.${goalId}` }, refresh);
  }
  return channel.subscribe();
}

export function setStageDone(stageId: string, done: boolean) {
  return supabase.rpc('change_team_stage_state', { target_stage: stageId, is_done: done });
}
export function saveStageNotes(stageId: string, notes: string) {
  return supabase.rpc('change_team_stage_notes', { target_stage: stageId, next_notes: notes });
}
export function addStage(goalId: string, userId: string, position: number, title: string) {
  return supabase.from('team_goal_stages').insert({ goal_id: goalId, created_by: userId, position, title });
}
export function updateStage(stageId: string, changes: Partial<Pick<TeamStage, 'title' | 'description' | 'materials'>>) {
  return supabase.from('team_goal_stages').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', stageId);
}
export function deleteStage(stageId: string) {
  return supabase.from('team_goal_stages').delete().eq('id', stageId);
}
export function proposeStageChange(proposal: Omit<TeamProposal, 'id' | 'status' | 'created_at'>) {
  return supabase.from('team_goal_proposals').insert(proposal);
}
export function reviewProposal(id: string, status: 'approved' | 'rejected', userId: string) {
  return supabase.from('team_goal_proposals').update({
    status, reviewed_by: userId, reviewed_at: new Date().toISOString(),
  }).eq('id', id);
}
export function undoLastTeamChange(goalId: string) {
  return supabase.rpc('undo_last_team_goal_change', { target_goal: goalId });
}

import type { ChallengeDraft } from './collaborationData';
import { supabase } from './supabase';

export type Competition = {
  id: string; creator_id: string; title: string; type: string; starts_at: string;
  ends_at: string; reward: string; status: 'invited' | 'active' | 'finished';
  winner_id: string | null; prize_result: string | null;
  challenge_participants: Array<{ user_id: string; invitation_status: string; score: number }>;
};

export async function createCompetition(userId: string, draft: ChallengeDraft) {
  const created = await supabase.from('challenges').insert({
    creator_id: userId, title: draft.title, type: draft.type, starts_at: draft.startsAt,
    ends_at: draft.endsAt, reward: 'Таинственный сундук',
  }).select('*').single<{ id: string }>();
  if (!created.data || created.error) return created;
  const participants = [userId, ...draft.participantIds].map((id) => ({
    challenge_id: created.data!.id, user_id: id,
    invitation_status: id === userId ? 'accepted' : 'pending',
    joined_at: id === userId ? new Date().toISOString() : null,
  }));
  const invited = await supabase.from('challenge_participants').insert(participants);
  return { data: created.data, error: invited.error };
}

export function loadCompetitions() {
  return supabase.from('challenges').select('*,challenge_participants(*)')
    .order('created_at', { ascending: false }).returns<Competition[]>();
}

export async function answerCompetition(challengeId: string, userId: string, accept: boolean) {
  const answered = await supabase.from('challenge_participants').update({
    invitation_status: accept ? 'accepted' : 'declined',
    joined_at: accept ? new Date().toISOString() : null,
  }).eq('challenge_id', challengeId).eq('user_id', userId);
  if (!answered.error && accept) await supabase.rpc('activate_ready_challenge', { target_id: challengeId });
  return answered;
}

export function finishCompetition(challengeId: string) {
  return supabase.rpc('finish_challenge', { target_id: challengeId });
}

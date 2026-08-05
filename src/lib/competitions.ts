import type { ChallengeDraft } from './collaborationData';
import { supabase } from './supabase';
import { publicAppUrl } from './appUrl';
import { asReward, createGeneratedReward, saveGeneratedChallengeReward } from './generatedRewards';

export type Competition = {
  id: string; creator_id: string; title: string; type: string; starts_at: string;
  ends_at: string; reward: string; status: 'invited' | 'active' | 'finished';
  winner_id: string | null; prize_result: string | null;
  created_at: string;
  challenge_participants: Array<{ user_id: string; invitation_status: string; score: number }>;
};
export type CompetitionInviteDetails = {
  challenge_id: string; title: string; challenge_type: string; starts_at: string;
  ends_at: string; inviter_name: string; participant_count: number;
};

export async function createCompetition(userId: string, draft: ChallengeDraft) {
  void userId;
  const result = await supabase.rpc('create_competition', {
    challenge_title: draft.title, challenge_type: draft.type,
    start_date: draft.startsAt, end_date: draft.endsAt,
    participant_ids: draft.participantIds.slice(0, 5),
  });
  return { data: typeof result.data === 'string' ? { id: result.data } : null, error: result.error };
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

export async function finishCompetition(challengeId: string) {
  const result = await supabase.rpc('finish_challenge', { target_id: challengeId });
  if (result.error || result.data !== '🏆 Все уникальные призы уже собраны') return result;
  const generated = await createGeneratedReward('challenge');
  if (!generated) return result;
  return saveGeneratedChallengeReward(challengeId, asReward(generated));
}

export function cancelCompetition(challengeId: string) {
  return supabase.rpc('cancel_recent_challenge', { target_id: challengeId });
}

export function createCompetitionInvite(challengeId: string) {
  return supabase.rpc('create_challenge_invite', { target_id: challengeId });
}

export function loadCompetitionInvite(token: string) {
  return supabase.rpc('get_challenge_invite', { invite_token: token })
    .maybeSingle<CompetitionInviteDetails>();
}

export function acceptCompetitionInvite(token: string) {
  return supabase.rpc('accept_challenge_invite', { invite_token: token });
}

export function competitionInviteUrl(token: string) {
  return publicAppUrl(`/challenges/invite/${token}`);
}

export function readCompetitionInviteToken(value: string) {
  const match = value.match(/(?:challenges\/invite\/)?([0-9a-f]{8}-[0-9a-f-]{27,})/i);
  return match?.[1] ?? '';
}

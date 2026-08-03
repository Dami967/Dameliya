import { supabase } from './supabase';

export type CallSignal = {
  id: string; call_id: string; sender_id: string; recipient_id: string;
  signal_type: 'offer' | 'answer' | 'ice' | 'hangup' | 'reject';
  payload: Record<string, unknown>; created_at: string;
};

export function sendCallSignal(callId: string, recipientId: string,
  signalType: CallSignal['signal_type'], payload: Record<string, unknown> = {}) {
  return supabase.from('call_signals').insert({
    call_id: callId, recipient_id: recipientId, signal_type: signalType, payload,
  });
}

export function subscribeToCallSignals(userId: string, receive: (signal: CallSignal) => void) {
  return supabase.channel(`calls:${userId}`).on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'call_signals', filter: `recipient_id=eq.${userId}`,
  }, (event) => receive(event.new as CallSignal)).subscribe();
}

export async function callerName(userId: string) {
  const { data } = await supabase.from('social_profiles').select('display_name,username,avatar_url')
    .eq('user_id', userId).maybeSingle();
  return { name: data?.display_name || data?.username || 'Друг', avatarUrl: data?.avatar_url ?? null };
}

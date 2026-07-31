import { supabase } from './supabase';

export type SupportMode = 'support' | 'bug' | 'rate';
export type SupportRequestDraft = {
  mode: SupportMode; subject: string; details: string; location: string; rating: number | null;
};

export async function sendSupportRequest(userId: string, draft: SupportRequestDraft) {
  const saved = await supabase.from('support_requests').insert({ user_id: userId, ...draft })
    .select('id').single<{ id: string }>();
  if (saved.error || !saved.data) return { error: saved.error ?? new Error('Request was not saved') };
  const notified = await supabase.functions.invoke('support-notify', {
    body: { requestId: saved.data.id, ...draft },
  });
  return { error: notified.error, saved: true };
}

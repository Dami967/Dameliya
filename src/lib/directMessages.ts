import { supabase } from './supabase';

export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  kind: 'text' | 'support' | 'gift' | 'audio' | 'call';
  content: string;
  created_at: string;
};

export function loadDirectMessages(userId: string, friendId: string) {
  return supabase.from('direct_messages').select('id,sender_id,recipient_id,kind,content,created_at')
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true }).returns<DirectMessage[]>();
}

export function sendDirectMessage(friendId: string, kind: DirectMessage['kind'], content: string) {
  return supabase.from('direct_messages').insert({ recipient_id: friendId, kind, content })
    .select('id,sender_id,recipient_id,kind,content,created_at').single<DirectMessage>();
}

export function deleteDirectMessage(messageId: string) {
  return supabase.from('direct_messages').delete().eq('id', messageId);
}

export function subscribeToMessages(userId: string, friendId: string, refresh: () => void) {
  return supabase.channel(`messages:${userId}:${friendId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, (event) => {
      const row = (event.new ?? event.old) as { sender_id?: string; recipient_id?: string };
      if ([row.sender_id, row.recipient_id].includes(userId)
        && [row.sender_id, row.recipient_id].includes(friendId)) refresh();
    }).subscribe();
}

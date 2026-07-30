import { supabase } from './supabase';

export type StoredChatMessage = {
  id: string;
  text?: string;
  audioUrl?: string;
  createdAt: string;
};

export type StoredActivity = {
  reaction?: string;
  comments: string[];
};

export type SocialStateScope = 'activity' | 'chat' | 'following';

export async function loadSocialState<T>(userId: string, scope: SocialStateScope, entityId: string) {
  return supabase.from('social_ui_state').select('payload').eq('user_id', userId)
    .eq('scope', scope).eq('entity_id', entityId).maybeSingle<{ payload: T }>();
}

export async function saveSocialState<T>(userId: string, scope: SocialStateScope, entityId: string, payload: T) {
  return supabase.from('social_ui_state').upsert({
    user_id: userId, scope, entity_id: entityId, payload, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,scope,entity_id' });
}

export async function uploadVoiceMessage(userId: string, blob: Blob) {
  const extension = blob.type.includes('wav') ? 'wav' : blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const result = await supabase.storage.from('voice-messages').upload(path, blob, {
    contentType: blob.type || `audio/${extension}`,
    cacheControl: '3600',
  });
  if (result.error) return { url: null, error: result.error };
  const publicUrl = supabase.storage.from('voice-messages').getPublicUrl(path).data.publicUrl;
  return { url: `${publicUrl}?v=${Date.now()}`, error: null };
}

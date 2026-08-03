import { supabase } from './supabase';

export type AppNotification = {
  id: string;
  actor_id: string | null;
  kind: 'follow' | 'message' | 'competition';
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
  actor_name?: string;
  actor_avatar?: string | null;
};

export async function loadNotifications(userId: string) {
  const result = await supabase.from('notifications').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(30).returns<AppNotification[]>();
  const actorIds = [...new Set((result.data ?? []).flatMap((item) => item.actor_id ? [item.actor_id] : []))];
  if (!actorIds.length) return result;
  const { data: actors } = await supabase.from('social_profiles')
    .select('user_id,display_name,username,avatar_url').in('user_id', actorIds);
  const names = new Map((actors ?? []).map((actor) => [actor.user_id, actor]));
  return { ...result, data: (result.data ?? []).map((item) => {
    const actor = item.actor_id ? names.get(item.actor_id) : null;
    return { ...item, actor_name: actor?.display_name || actor?.username || 'Пользователь GoalQuest',
      actor_avatar: actor?.avatar_url ?? null };
  }) };
}

export function markNotificationRead(id: string) {
  return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
}

export function markAllNotificationsRead(userId: string) {
  return supabase.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('user_id', userId).is('read_at', null);
}

export function subscribeToNotifications(userId: string, receive: (item: AppNotification) => void) {
  return supabase.channel(`notifications:${userId}`).on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}`,
  }, (event) => receive(event.new as AppNotification)).subscribe();
}

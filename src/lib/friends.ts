import { supabase } from './supabase';
import type { SocialUser } from './socialData';

type SocialProfileRow = {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  interests: string[];
  main_goal: string | null;
  xp: number;
  level: number;
  streak: number;
  last_seen_at: string;
};

function toSocialUser(profile: SocialProfileRow, pinned = false): SocialUser {
  const placeholder = ['Искатель целей', 'Пользователь', 'Goal Seeker'].includes(profile.display_name.trim());
  return {
    id: profile.user_id,
    name: !placeholder && profile.display_name ? profile.display_name : profile.username || 'Пользователь GoalQuest',
    username: profile.username || profile.user_id.slice(0, 8),
    avatar: profile.display_name.slice(0, 2).toUpperCase() || 'GQ',
    level: profile.level, xp: profile.xp, streak: profile.streak,
    online: Date.now() - new Date(profile.last_seen_at).getTime() < 5 * 60 * 1000,
    interests: profile.interests, goal: profile.main_goal || 'Главная цель скрыта', pinned,
  };
}

export async function loadMutualFriends(userId: string): Promise<SocialUser[]> {
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase.from('follows').select('following_id,is_pinned').eq('follower_id', userId),
    supabase.from('follows').select('follower_id').eq('following_id', userId),
  ]);
  const incomingIds = new Set((incoming ?? []).map((row) => row.follower_id));
  const mutual = (outgoing ?? []).filter((row) => incomingIds.has(row.following_id));
  if (!mutual.length) return [];
  const { data } = await supabase.from('social_profiles').select('*')
    .in('user_id', mutual.map((row) => row.following_id));
  const pinned = new Set(mutual.filter((row) => row.is_pinned).map((row) => row.following_id));
  return ((data ?? []) as SocialProfileRow[]).map((profile) =>
    toSocialUser(profile, pinned.has(profile.user_id)));
}

export async function loadRealPeople(userId: string) {
  const { data, error } = await supabase.from('social_profiles').select('*')
    .neq('user_id', userId).order('last_seen_at', { ascending: false }).limit(50);
  return { data: ((data ?? []) as SocialProfileRow[]).map((profile) => toSocialUser(profile)), error };
}

export function subscribeToFriendships(userId: string, refresh: () => void) {
  return supabase.channel(`friendships:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, (event) => {
      const row = event.new as { follower_id?: string; following_id?: string };
      const oldRow = event.old as { follower_id?: string; following_id?: string };
      if ([row.follower_id, row.following_id, oldRow.follower_id, oldRow.following_id].includes(userId)) refresh();
    }).subscribe();
}

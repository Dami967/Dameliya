import { supabase } from './supabase';

export type UserProfile = {
  user_id: string;
  display_name: string;
  username: string | null;
  bio: string;
  avatar_url: string | null;
  age: number | null;
  country: string;
  occupation: string;
  interests: string[];
  main_goals: string[];
  strengths: string;
  challenges: string;
  daily_goal: string;
  daily_minutes: number;
  completed_goals: number;
  completed_tasks: number;
  learning_minutes: number;
  xp: number;
  level: number;
  streak: number;
  momentum: number;
  momentum_updated_at: string;
  onboarding_completed: boolean;
  created_at: string;
};

export type UserSettings = {
  user_id: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  reminders: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  reminder_time: string;
};

export async function loadProfile(userId: string) {
  return supabase.from('profiles').select('*').eq('user_id', userId).single<UserProfile>();
}

export async function saveProfile(userId: string, changes: Partial<UserProfile>) {
  const result = await supabase.from('profiles').upsert({
    ...changes,
    user_id: userId,
    updated_at: new Date().toISOString(),
  });
  if (!result.error) window.dispatchEvent(new CustomEvent('goalquest-profile-changed', { detail: changes }));
  return result;
}

export async function loadSettings(userId: string) {
  return supabase.from('user_settings').select('*').eq('user_id', userId).single<UserSettings>();
}

export async function saveSettings(userId: string, changes: Partial<UserSettings>) {
  return supabase.from('user_settings').upsert({
    ...changes,
    user_id: userId,
    updated_at: new Date().toISOString(),
  });
}

export async function uploadAvatar(userId: string, file: File) {
  const extension = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${extension}`;
  const upload = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (upload.error) return { url: null, error: upload.error };
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
}

export function xpProgress(profile: UserProfile) {
  const levelStart = (profile.level - 1) * 300;
  return Math.min(100, Math.max(0, ((profile.xp - levelStart) / 300) * 100));
}

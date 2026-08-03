import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { loadProfile, type UserProfile } from './userProfile';

export function useCurrentProfile(userId?: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    if (!userId) { setProfile(null); return; }
    void loadProfile(userId).then(({ data }) => setProfile(data));
  }, [userId]);
  return profile;
}

export function currentUserName(user?: User, profile?: UserProfile | null) {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const authName = [metadata?.full_name, metadata?.name, metadata?.preferred_username]
    .find((value): value is string => typeof value === 'string' && Boolean(value.trim()));
  const profileName = profile?.display_name?.trim();
  const realProfileName = profileName && !['Искатель целей', 'Пользователь', 'Goal Seeker'].includes(profileName)
    ? profileName : '';
  return realProfileName || authName?.trim() || profile?.username?.trim()
    || user?.email?.split('@')[0] || 'Пользователь';
}

export function currentUsername(user?: User, profile?: UserProfile | null) {
  const value = profile?.username?.trim() || user?.email?.split('@')[0] || '';
  return value ? `@${value.replace(/^@/, '')}` : '';
}

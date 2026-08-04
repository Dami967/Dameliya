import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { loadProfile, type UserProfile } from './userProfile';

export function useCurrentProfile(userId?: string) {
  const [profile, setProfile] = useState<UserProfile | null | undefined>(() => cachedProfile(userId));
  useEffect(() => {
    if (!userId) { setProfile(null); return; }
    const cacheKey = `goalquest-profile-${userId}`;
    const changed = (event: Event) => setProfile((current) => {
      if (!current) return current;
      const next = { ...current, ...(event as CustomEvent<Partial<UserProfile>>).detail };
      localStorage.setItem(cacheKey, JSON.stringify(next));
      return next;
    });
    window.addEventListener('goalquest-profile-changed', changed);
    void loadProfile(userId).then(({ data }) => {
      setProfile(data);
      if (data) localStorage.setItem(cacheKey, JSON.stringify(data));
    });
    return () => window.removeEventListener('goalquest-profile-changed', changed);
  }, [userId]);
  return profile;
}

function cachedProfile(userId?: string) {
  if (!userId) return undefined;
  try {
    const value = localStorage.getItem(`goalquest-profile-${userId}`);
    return value ? JSON.parse(value) as UserProfile : undefined;
  } catch { return undefined; }
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

import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { loadProfile, type UserProfile } from './userProfile';

export function useCurrentProfile(userId?: string) {
  const [profile, setProfile] = useState<UserProfile | null | undefined>(() => cachedProfile(userId));
  useEffect(() => {
    if (!userId) return;
    setProfile(cachedProfile(userId));
    const changed = (event: Event) => setProfile((current) => {
      if (!current) return current;
      const next = { ...current, ...(event as CustomEvent<Partial<UserProfile>>).detail };
      storeCachedProfile(next);
      return next;
    });
    window.addEventListener('goalquest-profile-changed', changed);
    void loadProfile(userId).then(({ data }) => {
      setProfile(data);
      if (data) storeCachedProfile(data);
    });
    return () => window.removeEventListener('goalquest-profile-changed', changed);
  }, [userId]);
  return userId && profile?.user_id !== userId ? undefined : profile;
}

function cachedProfile(userId?: string) {
  try {
    const value = userId
      ? localStorage.getItem(`goalquest-profile-${userId}`)
      : localStorage.getItem('goalquest-current-profile');
    const profile = value ? JSON.parse(value) as UserProfile : undefined;
    return !userId || profile?.user_id === userId ? profile : undefined;
  } catch { return undefined; }
}

function storeCachedProfile(profile: UserProfile) {
  const value = JSON.stringify(profile);
  localStorage.setItem(`goalquest-profile-${profile.user_id}`, value);
  localStorage.setItem('goalquest-current-profile', value);
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

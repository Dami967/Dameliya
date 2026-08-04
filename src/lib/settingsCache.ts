import type { UserSettings } from './userProfile';

export function cachedSettings(userId?: string) {
  try {
    const raw = localStorage.getItem(userId ? `goalquest-settings-${userId}` : 'goalquest-current-settings');
    const value = raw ? JSON.parse(raw) as UserSettings : null;
    return value && (!userId || value.user_id === userId) ? value : null;
  } catch { return null; }
}

export function cacheSettings(settings: UserSettings) {
  const value = JSON.stringify(settings);
  localStorage.setItem(`goalquest-settings-${settings.user_id}`, value);
  localStorage.setItem('goalquest-current-settings', value);
}

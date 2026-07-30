import { loadProfile } from './userProfile';

export async function getAuthDestination(userId: string) {
  const invitedPath = sessionStorage.getItem('goalquest_after_auth');
  if (invitedPath && /^\/friends\/invite\/[0-9a-f-]{36}$/i.test(invitedPath)) {
    sessionStorage.removeItem('goalquest_after_auth');
    return invitedPath;
  }
  const { data: profile } = await loadProfile(userId);
  return profile?.onboarding_completed ? '/home' : '/onboarding';
}

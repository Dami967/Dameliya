import { loadProfile } from './userProfile';

export async function getAuthDestination(userId: string) {
  const { data: profile } = await loadProfile(userId);
  return profile?.onboarding_completed ? '/home' : '/onboarding';
}

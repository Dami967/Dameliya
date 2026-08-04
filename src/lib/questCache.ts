import type { AiQuestPlan } from './aiQuest';

const currentKey = 'goalquest-current-plans';

export function cachedQuestPlans(userId?: string) {
  try {
    const raw = localStorage.getItem(userId ? `goalquest-plans-${userId}` : currentKey);
    const plans = raw ? JSON.parse(raw) as AiQuestPlan[] : [];
    return !userId || plans.every((plan) => plan.user_id === userId) ? plans : [];
  } catch {
    return [];
  }
}

export function cacheQuestPlans(userId: string, plans: AiQuestPlan[]) {
  const value = JSON.stringify(plans);
  localStorage.setItem(`goalquest-plans-${userId}`, value);
  localStorage.setItem(currentKey, value);
}

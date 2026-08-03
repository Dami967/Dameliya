import { loadAiQuest, loadAiQuestById } from './aiQuest';

const storageKey = 'goalquest_active_plan_id';

export function activeQuestId() {
  return localStorage.getItem(storageKey);
}

export function rememberActiveQuest(planId: string) {
  localStorage.setItem(storageKey, planId);
  window.dispatchEvent(new CustomEvent('goalquest-active-plan-changed', { detail: planId }));
}

export async function loadActiveQuest(userId: string, explicitId?: string | null) {
  const planId = explicitId || activeQuestId();
  if (planId) {
    const selected = await loadAiQuestById(userId, planId);
    if (selected.data) return selected;
  }
  const latest = await loadAiQuest(userId);
  if (latest.data) rememberActiveQuest(latest.data.id);
  return latest;
}

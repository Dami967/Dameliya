import type { AiQuestPlan } from './aiQuest';
import type { QuestStep } from './questData';

export function reviewSourceKey(plan: AiQuestPlan, step: QuestStep, language: string) {
  const source = JSON.stringify([plan.id, plan.goal, step.id, step.title, language,
    step.details?.objective, step.details?.checklist, step.details?.lesson]);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  }
  return `review-v1-${(hash >>> 0).toString(16)}`;
}

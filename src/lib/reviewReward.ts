import { createGeneratedReward } from './generatedRewards';
import { supabase } from './supabase';

export async function claimReviewReward(planId: string, stepId: number) {
  const reward = await createGeneratedReward('chest');
  if (!reward) return 'Не удалось подготовить персональный приз. Его можно получить при повторном прохождении игры.';
  const result = await supabase.rpc('claim_review_reward', { target_plan: planId, target_step: stepId,
    reward_title: reward.title, reward_icon: reward.icon, reward_category: reward.category,
    reward_description: reward.description });
  if (result.error) return 'Результат игры сохранён, но приз пока не удалось получить. Попробуй повторить игру позже.';
  window.dispatchEvent(new Event('quest-progress-changed'));
  return String(result.data);
}

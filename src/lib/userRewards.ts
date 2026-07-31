import { supabase } from './supabase';
import type { Reward } from './rewardsData';

export type UserReward = {
  reward_id: string;
  equipped: boolean;
};

export async function loadUserRewards(userId: string) {
  return supabase.from('user_rewards').select('reward_id, equipped').eq('user_id', userId);
}

export async function toggleEquipped(userId: string, rewardId: string, equipped: boolean) {
  return supabase.from('user_rewards').upsert({
    user_id: userId,
    reward_id: rewardId,
    equipped,
    unlocked_at: new Date().toISOString(),
  }, { onConflict: 'user_id,reward_id' });
}

export async function equipRewardForCategory(userId: string, reward: Reward, equipped: boolean,
  categoryRewardIds: string[]) {
  if (equipped) {
    const cleared = await supabase.from('user_rewards').update({ equipped: false })
      .eq('user_id', userId).in('reward_id', categoryRewardIds);
    if (cleared.error) return cleared;
  }
  return toggleEquipped(userId, reward.id, equipped);
}

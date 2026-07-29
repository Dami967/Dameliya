import { supabase } from './supabase';

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

import { askAi, parseAiJson } from './ai';
import type { Reward, RewardCategory, RewardRarity } from './rewardsData';
import { supabase } from './supabase';

type GeneratedReward = { title: string; icon: string; category: RewardCategory; rarity: RewardRarity; description: string };

export async function createGeneratedReward(source: 'chest' | 'challenge') {
  const { data } = await supabase.from('ai_generated_rewards').select('title').limit(200);
  const existing = (data ?? []).map((item) => item.title);
  const result = await askAi(`Источник приза: ${source}. Уже существующие AI-награды: ${JSON.stringify(existing)}.
Придумай одну совершенно новую коллекционную награду для подросткового приложения целей. Она не должна повторять список.
Верни JSON: {"title":"2-4 слова","icon":"один emoji","category":"medals|accessories|frames|themes","rarity":"rare|epic|legendary|mythic","description":"за что запомнится награда"}.`,
  'Ты дизайнер добрых коллекционных наград GoalQuest. Не используй оружие, азартные игры и покупки. Только JSON на русском.',
  [], false, true);
  if (result.error || !result.text) return null;
  try {
    const value = parseAiJson<GeneratedReward>(result.text);
    if (!['medals', 'accessories', 'frames', 'themes'].includes(value.category)) return null;
    if (!['rare', 'epic', 'legendary', 'mythic'].includes(value.rarity)) return null;
    return { id: `ai-${crypto.randomUUID()}`, title: String(value.title).slice(0, 80),
      icon: String(value.icon).slice(0, 16), category: value.category, rarity: value.rarity,
      description: String(value.description).slice(0, 240) };
  } catch { return null; }
}

export function loadGeneratedRewards() {
  return supabase.from('ai_generated_rewards').select('*').order('created_at', { ascending: false });
}

export function asReward(value: GeneratedReward & { id: string; description: string }): Reward {
  return { ...value, unlocked: true, condition: value.description, isNew: true };
}

export function saveGeneratedChestReward(planId: string, chapterIndex: number, reward: ReturnType<typeof asReward>) {
  return supabase.rpc('save_ai_chest_reward', rewardParams(reward, {
    target_plan: planId, target_chapter: chapterIndex,
  }));
}

export function saveGeneratedChallengeReward(challengeId: string, reward: ReturnType<typeof asReward>) {
  return supabase.rpc('save_ai_challenge_reward', rewardParams(reward, { target_challenge: challengeId }));
}

function rewardParams(reward: ReturnType<typeof asReward>, target: Record<string, string | number>) {
  return { ...target, generated_id: reward.id, generated_title: reward.title, generated_icon: reward.icon,
    generated_category: reward.category, generated_rarity: reward.rarity, generated_description: reward.condition };
}

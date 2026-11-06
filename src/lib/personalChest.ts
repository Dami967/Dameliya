import { supabase } from './supabase';
import { createGeneratedReward } from './generatedRewards';
import { loadQuestChestOpenings } from './questChests';

export async function openPersonalChest(planId: string, chapterIndex: number) {
  const existing = await loadQuestChestOpenings(planId);
  if (existing.error) throw new Error('Не удалось проверить сундук. Попробуй снова.');
  const opened = existing.data?.find((item) => item.chapter_index === chapterIndex);
  if (opened) return opened.reward_label;
  const reward = await createGeneratedReward('chest');
  if (!reward) throw new Error('Кью не смог подобрать персональный подарок. Сундук сохранён — попробуй ещё раз.');
  const saved = await supabase.rpc('open_personal_quest_chest', { target_plan: planId, target_chapter: chapterIndex,
    generated_id: reward.id, generated_title: reward.title, generated_icon: reward.icon,
    generated_category: reward.category, generated_rarity: reward.rarity, generated_description: reward.description });
  if (saved.error || typeof saved.data !== 'string') throw new Error('Не удалось сохранить подарок. Попробуй снова.');
  window.dispatchEvent(new Event('quest-progress-changed'));
  return saved.data;
}

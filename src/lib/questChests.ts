import { supabase } from './supabase';

export type QuestChestOpening = { chapter_index: number; reward_label: string };

export function loadQuestChestOpenings(planId: string) {
  return supabase.from('quest_chest_openings').select('chapter_index,reward_label')
    .eq('plan_id', planId).returns<QuestChestOpening[]>();
}

export function openQuestChest(planId: string, chapterIndex: number) {
  return supabase.rpc('open_quest_chest', { target_plan: planId, target_chapter: chapterIndex });
}

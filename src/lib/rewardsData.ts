export type RewardCategory = 'medals' | 'outfits' | 'accessories' | 'eagle' | 'frames' | 'themes' | 'chests';
export type RewardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type Reward = {
  id: string;
  category: RewardCategory;
  title: string;
  icon: string;
  rarity: RewardRarity;
  unlocked: boolean;
  condition: string;
  progress?: number;
  isNew?: boolean;
};

export function isWearableReward(reward: Reward) {
  return ['outfits', 'accessories', 'eagle', 'frames', 'themes'].includes(reward.category);
}

export const rewardCategories: { id: RewardCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Все', icon: '✦' },
  { id: 'medals', label: 'Медали', icon: '🏅' },
  { id: 'outfits', label: 'Костюмы', icon: '👕' },
  { id: 'accessories', label: 'Аксессуары', icon: '🎒' },
  { id: 'eagle', label: 'Орлёнок', icon: '🦅' },
  { id: 'frames', label: 'Рамки и фоны', icon: '🖼️' },
  { id: 'themes', label: 'Темы', icon: '🎨' },
  { id: 'chests', label: 'Сундуки', icon: '🎁' },
];

export const rewards: Reward[] = [
  { id: 'first-step', category: 'medals', title: 'Первый шаг', icon: '🏅', rarity: 'common', unlocked: true, condition: 'Выполнить первую цель', isNew: true },
  { id: 'streak-seven', category: 'medals', title: 'Неделя в пути', icon: '🔥', rarity: 'rare', unlocked: true, condition: 'Серия 7 дней' },
  { id: 'project-hero', category: 'medals', title: 'Создатель', icon: '🏆', rarity: 'epic', unlocked: false, condition: 'Завершить крупный проект', progress: 62 },
  { id: 'team-spirit', category: 'medals', title: 'Командный дух', icon: '🤝', rarity: 'uncommon', unlocked: false, condition: 'Выполнить общую цель с другом', progress: 50 },
  { id: 'goal-master', category: 'medals', title: 'Мастер целей', icon: '🥇', rarity: 'legendary', unlocked: false, condition: 'Выполнить 50 целей', progress: 18 },
  { id: 'quest-legend', category: 'medals', title: 'Легенда GoalQuest', icon: '💠', rarity: 'mythic', unlocked: false, condition: 'Собрать все легендарные медали', progress: 4 },
  { id: 'explorer', category: 'outfits', title: 'Юный исследователь', icon: '🧥', rarity: 'rare', unlocked: true, condition: 'Пройти этап «Исследование»' },
  { id: 'founder', category: 'outfits', title: 'Основатель', icon: '👔', rarity: 'epic', unlocked: false, condition: 'Завершить экспедицию «Стартап»', progress: 40 },
  { id: 'scientist', category: 'outfits', title: 'Учёный', icon: '🥼', rarity: 'uncommon', unlocked: true, condition: 'Завершить 3 исследования' },
  { id: 'programmer', category: 'outfits', title: 'Программист', icon: '🧑‍💻', rarity: 'rare', unlocked: false, condition: 'Завершить проект по программированию', progress: 75 },
  { id: 'artist', category: 'outfits', title: 'Художник', icon: '👨‍🎨', rarity: 'epic', unlocked: false, condition: 'Создать творческий проект', progress: 30 },
  { id: 'traveler', category: 'outfits', title: 'Путешественник', icon: '🥾', rarity: 'legendary', unlocked: false, condition: 'Пройти 5 экспедиций', progress: 20 },
  { id: 'backpack', category: 'accessories', title: 'Рюкзак идей', icon: '🎒', rarity: 'common', unlocked: true, condition: 'Выполнить 5 заданий' },
  { id: 'compass', category: 'accessories', title: 'Компас цели', icon: '🧭', rarity: 'rare', unlocked: false, condition: 'Выполнить 15 заданий', progress: 67 },
  { id: 'glasses', category: 'accessories', title: 'Очки фокуса', icon: '👓', rarity: 'epic', unlocked: false, condition: '90 минут активной работы', progress: 73 },
  { id: 'laptop', category: 'accessories', title: 'Ноутбук создателя', icon: '💻', rarity: 'uncommon', unlocked: true, condition: 'Создать первый проект' },
  { id: 'camera', category: 'accessories', title: 'Камера открытий', icon: '📷', rarity: 'rare', unlocked: false, condition: 'Сохранить 20 моментов прогресса', progress: 35 },
  { id: 'microscope', category: 'accessories', title: 'Микроскоп', icon: '🔬', rarity: 'epic', unlocked: false, condition: 'Завершить научную экспедицию', progress: 45 },
  { id: 'telescope', category: 'accessories', title: 'Телескоп мечты', icon: '🔭', rarity: 'legendary', unlocked: false, condition: 'Достичь 20 уровня', progress: 30 },
  { id: 'wings', category: 'accessories', title: 'Крылья прогресса', icon: '🪽', rarity: 'mythic', unlocked: false, condition: 'Серия 365 дней', progress: 3 },
  { id: 'eagle-scarf', category: 'eagle', title: 'Шарф Кью', icon: '🧣', rarity: 'rare', unlocked: true, condition: 'Достичь 5 уровня' },
  { id: 'eagle-crown', category: 'eagle', title: 'Звёздная корона', icon: '👑', rarity: 'legendary', unlocked: false, condition: 'Набрать 10 000 XP', progress: 12 },
  { id: 'eagle-golden', category: 'eagle', title: 'Золотой окрас', icon: '🦅', rarity: 'epic', unlocked: false, condition: 'Открыть 10 сундуков', progress: 40 },
  { id: 'eagle-happy', category: 'eagle', title: 'Эмоция «Ура!»', icon: '🥳', rarity: 'uncommon', unlocked: true, condition: 'Выполнить недельную цель' },
  { id: 'eagle-flight', category: 'eagle', title: 'Звёздный полёт', icon: '✨', rarity: 'mythic', unlocked: false, condition: 'Получить 5 легендарных наград', progress: 0 },
  { id: 'forest-frame', category: 'frames', title: 'Лесная рамка', icon: '🌿', rarity: 'uncommon', unlocked: true, condition: 'Завершить первую экспедицию' },
  { id: 'space-frame', category: 'frames', title: 'Космическая рамка', icon: '🪐', rarity: 'epic', unlocked: false, condition: 'Достичь 15 уровня', progress: 40 },
  { id: 'summit-bg', category: 'frames', title: 'Фон «Вершина»', icon: '🏔️', rarity: 'rare', unlocked: false, condition: 'Выполнить 10 целей', progress: 60 },
  { id: 'legend-bg', category: 'frames', title: 'Зал легенд', icon: '🏛️', rarity: 'legendary', unlocked: false, condition: 'Победить в командном сезоне', progress: 10 },
  { id: 'aurora', category: 'themes', title: 'Полярное сияние', icon: '🌌', rarity: 'epic', unlocked: false, condition: 'Сезонное событие «Север»', progress: 25 },
  { id: 'sunrise', category: 'themes', title: 'Рассвет', icon: '🌅', rarity: 'common', unlocked: true, condition: 'Завершить 3 цели' },
  { id: 'midnight', category: 'themes', title: 'Полночь', icon: '🌙', rarity: 'rare', unlocked: false, condition: 'Выполнить 5 вечерних заданий', progress: 60 },
  { id: 'pixel', category: 'themes', title: 'Пиксельный мир', icon: '👾', rarity: 'legendary', unlocked: false, condition: 'Открыть костюм программиста', progress: 75 },
  { id: 'common-chest', category: 'chests', title: 'Обычный сундук', icon: '📦', rarity: 'common', unlocked: true, condition: 'Выполнить ежедневную цель' },
  { id: 'uncommon-chest', category: 'chests', title: 'Необычный сундук', icon: '🎁', rarity: 'uncommon', unlocked: true, condition: 'Серия 3 дня' },
  { id: 'rare-chest', category: 'chests', title: 'Редкий сундук', icon: '🎁', rarity: 'rare', unlocked: true, condition: 'Пройти 2 этапа' },
  { id: 'epic-chest', category: 'chests', title: 'Эпический сундук', icon: '🧰', rarity: 'epic', unlocked: false, condition: 'Выполнить месячную цель', progress: 48 },
  { id: 'legend-chest', category: 'chests', title: 'Легендарный сундук', icon: '🗝️', rarity: 'legendary', unlocked: false, condition: 'Победить в сезонном соревновании', progress: 18 },
  { id: 'mythic-chest', category: 'chests', title: 'Мифический сундук', icon: '💎', rarity: 'mythic', unlocked: false, condition: 'Достичь 50 уровня', progress: 6 },
];

export const rarityLabels: Record<RewardRarity, string> = {
  common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий', epic: 'Эпический',
  legendary: 'Легендарный', mythic: 'Мифический',
};

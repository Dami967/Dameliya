export type RewardCategory = 'medals' | 'outfits' | 'accessories' | 'eagle' | 'themes' | 'momentum' | 'chests';
export type RewardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type Reward = {
  id: string;
  category: RewardCategory;
  title: string;
  icon: string;
  rarity: RewardRarity;
  unlocked: boolean;
  condition: string;
  progress?: number;
};

export const rewardCategories: { id: RewardCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Все', icon: '✦' },
  { id: 'medals', label: 'Медали', icon: '🏅' },
  { id: 'outfits', label: 'Костюмы', icon: '👕' },
  { id: 'accessories', label: 'Аксессуары', icon: '🎒' },
  { id: 'eagle', label: 'Орлёнок', icon: '🦅' },
  { id: 'themes', label: 'Темы', icon: '🎨' },
  { id: 'momentum', label: 'Momentum', icon: '⚡' },
  { id: 'chests', label: 'Сундуки', icon: '🎁' },
];

export const rewards: Reward[] = [
  { id: 'first-step', category: 'medals', title: 'Первый шаг', icon: '🏅', rarity: 'common', unlocked: true, condition: 'Выполнить первую цель' },
  { id: 'streak-seven', category: 'medals', title: 'Неделя в пути', icon: '🔥', rarity: 'rare', unlocked: true, condition: 'Серия 7 дней' },
  { id: 'project-hero', category: 'medals', title: 'Создатель', icon: '🏆', rarity: 'epic', unlocked: false, condition: 'Завершить крупный проект', progress: 62 },
  { id: 'explorer', category: 'outfits', title: 'Юный исследователь', icon: '🧥', rarity: 'rare', unlocked: true, condition: 'Пройти этап «Исследование»' },
  { id: 'founder', category: 'outfits', title: 'Основатель', icon: '👔', rarity: 'epic', unlocked: false, condition: 'Завершить экспедицию «Стартап»', progress: 40 },
  { id: 'backpack', category: 'accessories', title: 'Рюкзак идей', icon: '🎒', rarity: 'common', unlocked: true, condition: 'Выполнить 5 заданий' },
  { id: 'compass', category: 'accessories', title: 'Компас цели', icon: '🧭', rarity: 'rare', unlocked: false, condition: 'Выполнить 15 заданий', progress: 67 },
  { id: 'glasses', category: 'accessories', title: 'Очки фокуса', icon: '👓', rarity: 'epic', unlocked: false, condition: '90 минут активной работы', progress: 73 },
  { id: 'eagle-scarf', category: 'eagle', title: 'Шарф Кью', icon: '🧣', rarity: 'rare', unlocked: true, condition: 'Достичь 5 уровня' },
  { id: 'eagle-crown', category: 'eagle', title: 'Звёздная корона', icon: '👑', rarity: 'legendary', unlocked: false, condition: 'Набрать 10 000 XP', progress: 12 },
  { id: 'aurora', category: 'themes', title: 'Полярное сияние', icon: '🌌', rarity: 'epic', unlocked: false, condition: 'Сезонное событие «Север»', progress: 25 },
  { id: 'sunrise', category: 'themes', title: 'Рассвет', icon: '🌅', rarity: 'common', unlocked: true, condition: 'Завершить 3 цели' },
  { id: 'energy', category: 'momentum', title: '+25 энергии', icon: '⚡', rarity: 'common', unlocked: true, condition: 'Награда за уровень 6' },
  { id: 'recovery', category: 'momentum', title: 'Быстрый заряд', icon: '🔋', rarity: 'rare', unlocked: false, condition: 'Серия 14 дней', progress: 50 },
  { id: 'rare-chest', category: 'chests', title: 'Редкий сундук', icon: '🎁', rarity: 'rare', unlocked: true, condition: 'Пройти 2 этапа' },
  { id: 'legend-chest', category: 'chests', title: 'Легендарный сундук', icon: '🗝️', rarity: 'legendary', unlocked: false, condition: 'Победить в сезонном соревновании', progress: 18 },
];

export const rarityLabels: Record<RewardRarity, string> = {
  common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный',
};

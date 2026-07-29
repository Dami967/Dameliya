export type QuestStep = {
  id: number;
  title: string;
  subtitle: string;
  state: 'done' | 'active' | 'locked';
  xp: number;
  icon: 'check' | 'sparkles' | 'book' | 'code' | 'rocket';
};

export const questSteps: QuestStep[] = [
  { id: 1, title: 'Определи идею', subtitle: 'Готово', state: 'done', xp: 50, icon: 'check' },
  { id: 2, title: 'Изучи рынок', subtitle: 'Текущее задание', state: 'active', xp: 100, icon: 'sparkles' },
  { id: 3, title: 'Поговори с пользователями', subtitle: 'Откроется дальше', state: 'locked', xp: 120, icon: 'book' },
  { id: 4, title: 'Создай прототип', subtitle: 'Заблокировано', state: 'locked', xp: 180, icon: 'code' },
  { id: 5, title: 'Первый запуск', subtitle: 'Финальный уровень', state: 'locked', xp: 250, icon: 'rocket' },
];

export const achievements = [
  { icon: 'flame', title: '7 дней в пути', tone: 'orange' },
  { icon: 'target', title: 'Первый шаг', tone: 'blue' },
  { icon: 'zap', title: 'На волне', tone: 'purple' },
] as const;

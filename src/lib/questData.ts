export type QuestStep = {
  id: number;
  title: string;
  subtitle: string;
  state: 'done' | 'active' | 'locked';
  xp: number;
  icon: 'check' | 'sparkles' | 'book' | 'code' | 'rocket';
  details?: QuestTaskDetails;
};

export type QuestTaskDetails = {
  objective: string;
  checklist: Array<{ title: string; hint: string }>;
  duration_minutes: number;
  category: string;
};

export const questSteps: QuestStep[] = [
  { id: 1, title: 'Определи идею', subtitle: 'Готово', state: 'done', xp: 50, icon: 'check' },
  { id: 2, title: 'Изучи рынок', subtitle: 'Текущее задание', state: 'active', xp: 100, icon: 'sparkles' },
  { id: 3, title: 'Поговори с пользователями', subtitle: 'Откроется дальше', state: 'locked', xp: 120, icon: 'book' },
  { id: 4, title: 'Собери план продукта', subtitle: 'Заблокировано', state: 'locked', xp: 140, icon: 'book' },
  { id: 5, title: 'Создай прототип', subtitle: 'Заблокировано', state: 'locked', xp: 180, icon: 'code' },
  { id: 6, title: 'Покажи первым людям', subtitle: 'Заблокировано', state: 'locked', xp: 200, icon: 'sparkles' },
  { id: 7, title: 'Улучши идею', subtitle: 'Заблокировано', state: 'locked', xp: 220, icon: 'code' },
  { id: 8, title: 'Подготовь презентацию', subtitle: 'Заблокировано', state: 'locked', xp: 240, icon: 'book' },
  { id: 9, title: 'Расскажи о проекте', subtitle: 'Заблокировано', state: 'locked', xp: 260, icon: 'sparkles' },
  { id: 10, title: 'Первый запуск', subtitle: 'Финальный этап', state: 'locked', xp: 350, icon: 'rocket' },
];

export const achievements = [
  { icon: 'flame', title: '7 дней в пути', tone: 'orange' },
  { icon: 'target', title: 'Первый шаг', tone: 'blue' },
  { icon: 'zap', title: 'На волне', tone: 'purple' },
] as const;

export type SocialUser = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  streak: number;
  online: boolean;
  interests: string[];
  goal: string;
  match?: number;
  pinned?: boolean;
};

export const socialUsers: SocialUser[] = [
  { id: 'aida', name: 'Аида С.', username: 'aida.codes', avatar: 'АС', level: 12, xp: 2840, streak: 18, online: true, interests: ['Программирование', 'Стартапы'], goal: 'Запустить первое приложение', pinned: true },
  { id: 'amir', name: 'Амир К.', username: 'amir.learns', avatar: 'АК', level: 9, xp: 1960, streak: 7, online: true, interests: ['Английский', 'Олимпиады'], goal: 'Сдать IELTS на 7.5' },
  { id: 'sasha', name: 'Саша Л.', username: 'sasha.design', avatar: 'СЛ', level: 8, xp: 1740, streak: 12, online: false, interests: ['Дизайн', 'Исследования'], goal: 'Собрать портфолио' },
  { id: 'dana', name: 'Дана Т.', username: 'dana.science', avatar: 'ДТ', level: 11, xp: 2530, streak: 24, online: false, interests: ['Исследования', 'Английский'], goal: 'Победить на научном конкурсе' },
];

export const suggestions: SocialUser[] = [
  { id: 'mina', name: 'Мина Р.', username: 'mina.builds', avatar: 'МР', level: 10, xp: 2210, streak: 15, online: true, interests: ['Стартапы', 'Программирование'], goal: 'Создать полезный сервис', match: 94 },
  { id: 'arsen', name: 'Арсен Ж.', username: 'arsen.english', avatar: 'АЖ', level: 7, xp: 1490, streak: 9, online: false, interests: ['Английский', 'Путешествия'], goal: 'Свободно говорить по-английски', match: 87 },
  { id: 'aliya', name: 'Алия Н.', username: 'aliya.research', avatar: 'АН', level: 13, xp: 3150, streak: 31, online: true, interests: ['Исследования', 'Олимпиады'], goal: 'Защитить исследовательский проект', match: 82 },
  { id: 'timur', name: 'Тимур А.', username: 'timur.startup', avatar: 'ТА', level: 9, xp: 1870, streak: 11, online: true, interests: ['Стартапы', 'Дизайн'], goal: 'Собрать команду для стартапа', match: 80 },
  { id: 'sofia', name: 'София М.', username: 'sofia.creates', avatar: 'СМ', level: 8, xp: 1630, streak: 6, online: false, interests: ['Искусство', 'Программирование'], goal: 'Создать интерактивную выставку', match: 77 },
  { id: 'nursultan', name: 'Нурсултан Е.', username: 'nursultan.math', avatar: 'НЕ', level: 14, xp: 3480, streak: 28, online: true, interests: ['Олимпиады', 'Исследования'], goal: 'Пройти на международную олимпиаду', match: 74 },
  { id: 'eva', name: 'Ева П.', username: 'eva.speaks', avatar: 'ЕП', level: 6, xp: 1280, streak: 14, online: true, interests: ['Английский', 'Книги'], goal: 'Прочитать 20 книг на английском', match: 71 },
  { id: 'mark', name: 'Марк Д.', username: 'mark.robotics', avatar: 'МД', level: 11, xp: 2690, streak: 19, online: false, interests: ['Робототехника', 'Программирование'], goal: 'Собрать своего первого робота', match: 68 },
];

export const activities = [
  { id: 1, user: socialUsers[0], icon: '🚀', title: 'перешла на 12 уровень', text: 'Новая высота взята! Следующая остановка — запуск приложения.', time: '12 мин', reactions: { '❤️': 8, '🔥': 14, '👏': 5, '💡': 2 } },
  { id: 2, user: socialUsers[1], icon: '🎯', title: 'выполнил цель', text: 'Закончил недельный челлендж «30 новых слов каждый день».', time: '1 ч', reactions: { '❤️': 11, '🔥': 6, '👏': 18, '💡': 1 } },
  { id: 3, user: socialUsers[3], icon: '🏆', title: 'получила награду', text: 'Медаль «Исследователь» за завершённый научный проект.', time: 'вчера', reactions: { '❤️': 16, '🔥': 9, '👏': 21, '💡': 4 } },
];

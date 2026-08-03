import { loadProfile } from './userProfile';

export async function loadInterviewContext(userId: string) {
  const { data } = await loadProfile(userId);
  if (!data) return 'Данные интервью пока не заполнены.';

  const values = [
    pair('Имя', data.display_name),
    pair('Возраст', data.age),
    pair('Страна', data.country),
    pair('Учёба или работа', data.occupation),
    pair('Интересы', data.interests),
    pair('Главные цели', data.main_goals),
    pair('Сильные стороны', data.strengths),
    pair('Трудности', data.challenges),
    pair('Ежедневная цель', data.daily_goal),
    pair('Доступное время в день', data.daily_minutes ? `${data.daily_minutes} минут` : ''),
  ].filter(Boolean);

  return values.length ? `Интервью пользователя:\n${values.join('\n')}` : 'Данные интервью пока не заполнены.';
}

function pair(label: string, value: string | number | string[] | null) {
  const text = Array.isArray(value) ? value.join(', ') : String(value ?? '').trim();
  return text ? `${label}: ${text}.` : '';
}

export const conciseMentorRules = `
Ответ должен быть очень коротким: максимум 60 слов.
Без Markdown-заголовков, длинного вступления и повторения слов пользователя.
Дай одну главную мысль и максимум 3 коротких шага.
Задавай не больше одного вопроса и только если без ответа нельзя продолжить.
Не спрашивай то, что уже известно из цели, профиля, заметок или прошлых разговоров.
Если можно сделать разумный вывод, сделай его сам и предложи учесть в следующем задании квеста.
Большой план не пиши в чат: его место в карте и заданиях квеста.`;

export function compactMentorReply(value: string) {
  const clean = value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .trim();
  const words = clean.split(/\s+/);
  if (words.length <= 60) return clean;
  const shortened = words.slice(0, 60).join(' ');
  const lastSentence = Math.max(shortened.lastIndexOf('.'), shortened.lastIndexOf('!'), shortened.lastIndexOf('?'));
  return `${lastSentence > 80 ? shortened.slice(0, lastSentence + 1) : shortened}…`;
}

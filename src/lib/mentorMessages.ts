export function welcome(language: string) {
  if (language === 'ru') return 'Привет! Расскажи, над какой целью ты работаешь 🦅';
  if (language === 'kk') return 'Сәлем! Қандай мақсатпен жұмыс істеп жатқаныңды айт 🦅';
  return 'Hi! Tell me which goal you are working on 🦅';
}

export function fallback(language: string) {
  if (language === 'ru') return 'Сейчас не получилось получить ответ. Попробуй ещё раз.';
  if (language === 'kk') return 'Қазір жауап алу мүмкін болмады. Қайтадан байқап көр.';
  return 'I could not get an answer right now. Please try again.';
}

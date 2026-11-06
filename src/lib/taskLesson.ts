export type TaskLesson = {
  explanation: string;
  examples: Array<{ question: string; steps: string[]; answer: string }>;
  exercises: Array<{ question: string; hint: string; answer: string }>;
};

export const standaloneTaskRules = `Все учебные материалы и упражнения должны быть внутри GoalQuest.
Не отправляй к учебнику, в тетрадь, на сайт и не проси самостоятельно искать или придумывать примеры.
Для практических целей дай доступную практику и поле для отчёта, а не выдуманные результаты.
Для языков строго соблюдай изучаемый язык из цели: итальянский нельзя заменять английским.
Формулы пиши понятной записью: 2 × 2 × 2 = 2³ = 8. Без LaTeX, знаков доллара и команд с обратным слешем.
Объяснение разбивай на короткие абзацы по 2–3 предложения, пустая строка между абзацами. Одно правило на абзац.
Каждый пример и шаг начинай с новой строки. Объясняй значения символов.`;

export const lessonSchema = `Добавь поле "lesson": {
"explanation":"Полное простое объяснение темы: определения, правила и все исходные данные",
"examples":[{"question":"Конкретный разобранный пример","steps":["Первый шаг с объяснением","Следующий шаг"],"answer":"Ответ и почему он верен"}],
"exercises":[{"question":"Готовое условие упражнения со всеми данными","hint":"Подсказка без готового ответа","answer":"Эталон ответа или критерии для открытого ответа"}] }.
Дай 2 разобранных примера и ровно 5 разных упражнений по текущему этапу, от простого к сложному.
Checklist: изучить объяснение здесь, разобрать приведённые примеры, ответить на 5 упражнений здесь.
expected_answer должен соответствовать именно этим пяти упражнениям. Видео — дополнительный материал:
весь урок должен быть выполним без просмотра видео. Поле resources оставь пустым: видео найдёт отдельный поиск.`;

export function isTaskLesson(value: unknown): value is TaskLesson {
  if (!value || typeof value !== 'object') return false;
  const lesson = value as Partial<TaskLesson>;
  const text = (item: unknown) => typeof item === 'string' && item.trim().length > 0;
  return text(lesson.explanation) && Array.isArray(lesson.examples) && lesson.examples.length >= 1
    && lesson.examples.every((item) => item && text(item.question) && text(item.answer)
      && Array.isArray(item.steps) && item.steps.length > 0 && item.steps.every(text))
    && Array.isArray(lesson.exercises) && lesson.exercises.length === 5
    && lesson.exercises.every((item) => item && text(item.question) && text(item.hint) && text(item.answer));
}

export function degreeFallbackLesson(title: string): TaskLesson | null {
  if (!/степен/i.test(title)) return null;
  return {
    explanation: 'Степень числа — это произведение одинаковых множителей. В записи aⁿ число a называют основанием, а n показывает, сколько раз его умножают само на себя.',
    examples: [
      { question: 'Запиши 5 × 5 × 5 в виде степени.', steps: ['Основание равно 5.', 'Множитель повторяется 3 раза.', 'Получаем 5³.'], answer: '5³' },
      { question: 'Вычисли 2⁴.', steps: ['Раскроем степень: 2 × 2 × 2 × 2.', 'Перемножим множители: 4 × 4 = 16.'], answer: '16' },
    ],
    exercises: [
      { question: 'Запиши 3 × 3 × 3 × 3 в виде степени.', hint: 'Посчитай одинаковые множители.', answer: '3⁴' },
      { question: 'Вычисли 4².', hint: 'Умножь 4 на себя два раза.', answer: '16' },
      { question: 'Назови основание и показатель в 7⁵.', hint: 'Основание — число, которое повторяется.', answer: 'Основание 7, показатель 5.' },
      { question: 'Раскрой степень 6³ в виде произведения.', hint: 'Повтори множитель 6 три раза.', answer: '6 × 6 × 6' },
      { question: 'Сравни 2³ и 3².', hint: 'Сначала вычисли обе степени.', answer: '2³ = 8, 3² = 9, поэтому 2³ < 3².' },
    ],
  };
}

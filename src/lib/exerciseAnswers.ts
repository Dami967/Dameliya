import type { TaskLesson } from './taskLesson';

const marker = '\n\n--- Ответы на упражнения GoalQuest ---\n';
type SavedAnswers = { answers: string[]; questions: string[] };

export function readExerciseNotes(value: string) {
  const index = value.lastIndexOf(marker);
  if (index < 0) return { notes: value, answers: [] as string[], questions: [] as string[] };
  try {
    const data = JSON.parse(value.slice(index + marker.length)) as SavedAnswers;
    if (!Array.isArray(data.answers) || !data.answers.every((item) => typeof item === 'string')
      || !Array.isArray(data.questions) || !data.questions.every((item) => typeof item === 'string')) throw new Error();
    return { notes: value.slice(0, index), ...data };
  } catch { return { notes: value, answers: [] as string[], questions: [] as string[] }; }
}

export function writeExerciseNotes(notes: string, answers: string[], lesson?: TaskLesson) {
  if (!lesson || !answers.some((answer) => answer.trim())) return notes;
  return notes + marker + JSON.stringify({ answers, questions: lesson.exercises.map((item) => item.question) });
}

export function readableExerciseNotes(value: string) {
  const { notes, answers, questions } = readExerciseNotes(value);
  return [notes, ...answers.map((answer, index) =>
    `Упражнение ${index + 1}: ${questions[index] ?? ''}\nОтвет ученика: ${answer || '(пока нет ответа)'}`)].join('\n\n');
}

export function replaceGeneralNotes(value: string, notes: string) {
  const saved = readExerciseNotes(value);
  return saved.answers.length ? notes + marker + JSON.stringify({ answers: saved.answers, questions: saved.questions }) : notes;
}

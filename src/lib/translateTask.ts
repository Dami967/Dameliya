import { askAi, parseAiJson } from './ai';
import { languageName } from './languages';
import type { QuestStep } from './questData';
import { isTaskLesson } from './taskLesson';

const fields = new Set(['title', 'subtitle', 'objective', 'expected_answer', 'category',
  'hint', 'explanation', 'question', 'steps', 'answer']);

function mapTexts(value: unknown, replace: (text: string, key: string) => string, key = ''): unknown {
  if (key === 'resources') return value; // Keep actual video titles and links intact.
  if (typeof value === 'string') return fields.has(key) ? replace(value, key) : value;
  if (Array.isArray(value)) return value.map((item) => mapTexts(item, replace, key));
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([field, item]) => [field, mapTexts(item, replace, field)]));
  return value;
}

export function taskNeedsTranslation(step: QuestStep, language: string) {
  if (!step.details?.lesson) return false;
  if (step.details.language === language) return false;
  if (language !== 'ru') return true;
  let foreign = false;
  mapTexts(step, (text, key) => {
    // Answers can intentionally contain foreign words or formulas.
    if (key !== 'answer' && key !== 'expected_answer') {
      const latin = text.match(/[a-z]{3,}/gi)?.length ?? 0;
      const russian = text.match(/[а-яё]{2,}/gi)?.length ?? 0;
      if (latin >= 2 && latin > russian) foreign = true;
    }
    return text;
  });
  return foreign;
}

const translations = new Map<string, Promise<QuestStep>>();

export function translateTask(step: QuestStep, language: string, goal: string) {
  const key = JSON.stringify([language, goal, step]);
  const existing = translations.get(key);
  if (existing) return existing;
  const pending = translate(step, language, goal).catch((error: unknown) => {
    translations.delete(key);
    throw error;
  });
  translations.set(key, pending);
  if (translations.size > 20) translations.delete(translations.keys().next().value!);
  return pending;
}

async function translate(step: QuestStep, language: string, goal: string) {
  const texts: string[] = [];
  mapTexts(step, (text) => { texts.push(text); return text; });
  const translated: string[] = [];
  for (let start = 0; start < texts.length; start += 80) {
    const batch = texts.slice(start, start + 80);
    const result = await askAi(JSON.stringify(batch),
      `Translate every string into ${languageName(language)}. This is a learning task for: ${goal}.
Translate all instructions, explanation, worked example steps, practice questions and checklist.
Keep the same meaning, numbers, formulas, exercise order and answers. Do not invent new tasks.
For foreign language study keep the studied words, but translate the explanations and instructions.
Return ONLY a JSON array of strings, exactly the same length and order.`, [], false, true);
    if (result.error) throw result.error;
    const output = parseAiJson<unknown>(result.text ?? '');
    if (!Array.isArray(output) || output.length !== batch.length
      || !output.every((item) => typeof item === 'string' && item.trim())) {
      throw new Error('Перевод урока получился неполным. Нажми «Попробовать снова».');
    }
    translated.push(...output);
  }
  let index = 0;
  const updated = mapTexts(step, () => translated[index++]) as QuestStep;
  if (!updated.details || !isTaskLesson(updated.details.lesson) || (language === 'ru' && taskNeedsTranslation({ ...updated, details: { ...updated.details, language: undefined } }, language))) {
    throw new Error('Не удалось подготовить урок на выбранном языке. Попробуй снова.');
  }
  return { ...updated, details: { ...updated.details, language } };
}

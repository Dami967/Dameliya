import { askAi, parseAiJson } from './ai';
import type { AiQuestPlan } from './aiQuest';
import { supabase } from './supabase';

const textFields = new Set(['map_title', 'title', 'subtitle', 'objective', 'expected_answer', 'hint', 'description', 'explanation', 'question', 'answer', 'steps', 'category']);

// Translate text only: IDs, progress, rewards and resource URLs stay intact.
function mapTexts(value: unknown, translate: (text: string) => string, key = ''): unknown {
  if (typeof value === 'string') return textFields.has(key) ? translate(value) : value;
  if (Array.isArray(value)) return value.map((item) => mapTexts(item, translate, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, mapTexts(item, translate, field)]));
  }
  return value;
}

export async function translateQuestToRussian(plan: AiQuestPlan) {
  const source = { map_title: plan.map_title, steps: plan.steps };
  const texts: string[] = [];
  mapTexts(source, (text) => { texts.push(text); return text; });
  const result = await askAi(JSON.stringify(texts),
    'Переведи каждый элемент массива на русский. Уже русский текст оставь без изменений. Сохрани смысл, формулы, числа и порядок. В заданиях на изучение иностранных языков сохраняй учебные примеры и правильные ответы на изучаемом языке; переводи объяснения. Верни только JSON массив строк той же длины.', [], false, true);
  if (result.error) throw result.error;
  const translated = parseAiJson<unknown>(result.text ?? '');
  if (!Array.isArray(translated) || translated.length !== texts.length
    || !translated.every((text) => typeof text === 'string' && text.trim())) {
    throw new Error('Не удалось перевести карту. Попробуй ещё раз.');
  }
  let index = 0;
  const changes = mapTexts(source, () => translated[index++]) as Pick<AiQuestPlan, 'map_title' | 'steps'>;
  if (!/[а-яё]/i.test(changes.map_title)) throw new Error('Кью вернул название на другом языке. Попробуй перевод ещё раз.');
  const saved = await supabase.from('ai_quest_plans').update(changes)
    .eq('id', plan.id).eq('user_id', plan.user_id).eq('updated_at', plan.updated_at).select().single<AiQuestPlan>();
  if (saved.error) throw new Error('Не удалось сохранить перевод. Попробуй ещё раз.');
  return saved.data;
}

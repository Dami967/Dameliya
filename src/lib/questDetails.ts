import type { QuestResource, QuestStep, QuestTaskDetails } from './questData';
import { isTaskLesson } from './taskLesson';

export function normalizeQuestStep(step: QuestStep): QuestStep {
  return { ...step, details: step.details ? normalizeDetails(step.details, step.subtitle) : fallbackDetails(step) };
}

export function normalizeDetails(value: Partial<QuestTaskDetails>, fallback: string): QuestTaskDetails {
  const checklist = Array.isArray(value.checklist) ? value.checklist.slice(0, 3).map((item) => ({
    title: String(item.title || 'Выполни следующий шаг'),
    hint: String(item.hint || 'Сосредоточься на небольшом измеримом результате.'),
  })) : [];
  if (checklist.length !== 3) return fallbackDetails({ title: fallback, subtitle: fallback } as QuestStep);
  const explicitResources = Array.isArray(value.resources) ? value.resources.slice(0, 2).flatMap((resource, index) => {
    const type = resource.type;
    const url = String(resource.url || '');
    if (!['video', 'article', 'test'].includes(type)) return [];
    if (type === 'video' && !isSafeResourceUrl(url)) return [];
    return [{ type, title: String(resource.title || 'Полезный материал'),
      description: String(resource.description || ''),
      url: type === 'video' ? url : `goalquest://material/${index}` }] as QuestTaskDetails['resources'];
  }) : [];
  const text = `${value.objective || ''} ${checklist.map((item) => `${item.title} ${item.hint}`).join(' ')}`;
  const implied = impliedResources(text);
  const discovered = discoverResources(text, String(value.category || ''));
  return {
    language: value.language,
    objective: String(value.objective || fallback),
    expected_answer: String(value.expected_answer || `Готовый результат «${fallback}», подтверждающий выполнение всех пунктов.`),
    duration_minutes: Math.min(180, Math.max(5, Number(value.duration_minutes) || 25)),
    category: String(value.category || 'Практика'),
    checklist,
    lesson: isTaskLesson(value.lesson) ? value.lesson : undefined,
    resources: [...explicitResources, ...implied, ...discovered].filter((resource, index, items) =>
      items.findIndex((item) => item.url === resource.url) === index).slice(0, 3),
  };
}

function impliedResources(text: string): QuestResource[] {
  if (!/тест|test|quiz|викторин|диагност/i.test(text)) return [];
  return [{ type: 'test', title: 'Диагностический тест', url: 'goalquest://material/test',
    description: 'Пять вопросов по теме задания с проверкой и объяснениями.' }];
}

export function fallbackDetails(step: QuestStep): QuestTaskDetails {
  return {
    objective: step.subtitle || `Выполни этап «${step.title}» и сохрани конкретный результат.`,
    expected_answer: `Конкретный результат этапа «${step.title}», подтверждающий выполнение всех трёх пунктов.`,
    duration_minutes: 25,
    category: 'Практика',
    resources: [],
    checklist: [
      { title: 'Определи результат', hint: `Запиши, что должно получиться после этапа «${step.title}».` },
      { title: 'Сделай основной шаг', hint: 'Выдели 20 минут и сосредоточься только на этой задаче.' },
      { title: 'Зафиксируй итог', hint: 'Сохрани результат и коротко запиши, что получилось.' },
    ],
  };
}

function isSafeResourceUrl(value: string) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function discoverResources(text: string, category: string): QuestResource[] {
  const urls = text.match(/https:\/\/[^\s<>"']+/gi) ?? [];
  return [...new Set(urls.map((url) => url.replace(/[),.;!?]+$/g, '')))]
    .filter(isSafeResourceUrl).map((url) => {
      const isVideo = /youtu\.?be/i.test(url);
      const isTest = /тест|test|quiz|диагност/i.test(`${category} ${text}`);
      return {
        type: isVideo ? 'video' : isTest ? 'test' : 'article',
        title: isVideo ? 'Видеоурок' : isTest ? 'Пройти тест' : 'Открыть материал',
        url,
        description: 'Материал, указанный Кью в задании.',
      };
    });
}

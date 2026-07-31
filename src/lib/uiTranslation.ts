import { askAi, parseAiJson } from './ai';
import { languageName } from './languages';

const cachePrefix = 'goalquest-ui-translations-v1-';

export function readUiTranslation(language: string, source: string) {
  return readCache(language)[source];
}

export function saveUiTranslations(language: string, translations: Record<string, string>) {
  const cache = { ...readCache(language), ...translations };
  const entries = Object.entries(cache).slice(-700);
  window.localStorage.setItem(`${cachePrefix}${language}`, JSON.stringify(Object.fromEntries(entries)));
}

export async function translateUiBatch(sources: string[], language: string) {
  if (language === 'ru' || !sources.length) return Object.fromEntries(sources.map((text) => [text, text]));
  const result = await askAi(JSON.stringify(sources), [
    'You translate a mobile app interface from Russian into ' + languageName(language) + '.',
    'Return only a valid JSON array of translated strings in exactly the same order and length.',
    'Keep GoalQuest, Q, usernames, emoji, numbers, XP, URLs and formatting unchanged.',
    'If a string is already in the target language, return it unchanged.',
  ].join(' '));
  if (result.error || !result.text) return {};
  try {
    const translated = parseAiJson<unknown>(result.text);
    if (!Array.isArray(translated) || translated.length !== sources.length) return {};
    return Object.fromEntries(sources.map((source, index) => [source,
      typeof translated[index] === 'string' ? translated[index] : source]));
  } catch {
    return {};
  }
}

function readCache(language: string): Record<string, string> {
  try {
    const value = JSON.parse(window.localStorage.getItem(`${cachePrefix}${language}`) ?? '{}') as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, string> : {};
  } catch {
    return {};
  }
}

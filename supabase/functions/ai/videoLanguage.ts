const languages = [
  /итальян|italian|italiano/iu,
  /англий|english/iu,
  /немец|german|deutsch/iu,
  /француз|french|français/iu,
  /испан|spanish|español/iu,
  /япон|japanese|日本語/iu,
  /корей|korean|한국어/iu,
  /китай|chinese|中文|mandarin/iu,
  /турец|turkish|türkçe/iu,
  /арабск|arabic|العربية/iu,
  /казах|kazakh|қазақ/iu,
  /русск|russian|орыс/iu,
];

export function matchesTargetLanguage(query: string, title: string, channel: string) {
  const goal = query.match(/Цель(?: пользователя)?:\s*([^\.\n]+)/iu)?.[1] ?? query;
  const targets = languages.filter((language) => language.test(goal));
  if (targets.length !== 1) return true; // Ambiguous goals are checked by semantic selection.
  return targets[0].test(`${title} ${channel}`);
}


export function requestedVideoLanguage(query: string) {
  return query.match(/Язык видео:\s*([a-z]{2,3})\b/i)?.[1]?.toLowerCase() ?? '';
}

export function matchesSpokenLanguage(query: string, title: string) {
  const language = requestedVideoLanguage(query);
  if (!language) return true;
  // Reject clearly different scripts before semantic selection, including fallbacks.
  const scripts: Record<string, RegExp> = {
    ru: /[а-яё]/i, kk: /[а-яәғқңөұүһі]/i, uk: /[а-яіїєґ]/i,
    en: /[a-z]/i, ja: /[ぁ-ヿ一-龯]/, ko: /[가-힣]/, zh: /[一-龯]/,
    ar: /[\u0600-\u06ff]/, he: /[\u0590-\u05ff]/,
  };
  if (language === 'en' && /[а-яё]/i.test(title)) return false;
  return !scripts[language] || scripts[language].test(title);
}

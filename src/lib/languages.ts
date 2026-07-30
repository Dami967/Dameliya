export type AppLanguage = {
  code: string;
  name: string;
  nativeName: string;
  direction?: 'rtl';
};

export const appLanguages: AppLanguage[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', direction: 'rtl' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', direction: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'uz', name: 'Uzbek', nativeName: 'O‘zbekcha' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycanca' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
];

const supportedCodes = new Set(appLanguages.map((language) => language.code));

export function detectLanguage() {
  const saved = window.localStorage.getItem('goalquest-language');
  if (saved && supportedCodes.has(saved)) return saved;
  const candidates = navigator.languages.length ? navigator.languages : [navigator.language];
  return candidates.map((locale) => locale.toLowerCase().split('-')[0])
    .find((code) => supportedCodes.has(code)) ?? 'en';
}

export function rememberLanguage(code: string) {
  window.localStorage.setItem('goalquest-language', code);
  document.documentElement.lang = code;
  document.documentElement.dir = appLanguages.find((language) => language.code === code)?.direction ?? 'ltr';
}

export function languageName(code: string) {
  return appLanguages.find((language) => language.code === code)?.name ?? 'English';
}

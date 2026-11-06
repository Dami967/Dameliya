import { useEffect, useRef, useState } from 'react';
import { cachedSettings, cacheSettings } from './settingsCache';
import { detectLanguage, rememberLanguage } from './languages';
import { loadSettings, type UserSettings } from './userProfile';

export function useSettings(userId?: string) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const revision = useRef(0);

  useEffect(() => {
    setSettings(userId ? cachedSettings(userId) : null);
    setLoadError('');
    if (!userId) return;
    let active = true;
    const requestRevision = revision.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!active) return;
      active = false;
      controller.abort();
      setLoadError('Сервер долго отвечает. Проверь интернет и попробуй снова.');
    }, 10_000);

    void loadSettings(userId, controller.signal).then(({ data, error }) => {
      if (!active) return;
      window.clearTimeout(timer);
      if (error || !data) {
        setLoadError('Не удалось загрузить настройки. Попробуй ещё раз.');
        return;
      }
      if (requestRevision !== revision.current) return;
      setSettings(data);
      cacheSettings(data);
      document.documentElement.dataset.theme = data.theme;
      if (detectLanguage() !== data.language) rememberLanguage(data.language);
    }).catch(() => {
      if (active) setLoadError('Не удалось загрузить настройки. Проверь интернет и попробуй снова.');
    }).finally(() => window.clearTimeout(timer));

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [userId, attempt]);

  return { settings, setSettings, loadError,
    retry: () => setAttempt((value) => value + 1),
    markEdited: () => { revision.current += 1; } };
}

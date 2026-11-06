import { useEffect, useRef, useState } from 'react';
import type { AiQuestPlan } from '../lib/aiQuest';
import { useSettings } from '../lib/useSettings';
import { translateQuestToRussian } from '../lib/translateQuest';

type Props = { plan: AiQuestPlan; onTranslated: (plan: AiQuestPlan) => void };

export function QuestTranslation({ plan, onTranslated }: Props) {
  const { settings } = useSettings(plan.user_id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempted = useRef(new Set<string>());
  const needsTranslation = settings?.language === 'ru' && /[a-z]{3}/i.test(plan.map_title)
    && !/[а-яё]/i.test(plan.map_title);

  async function translate() {
    setBusy(true); setError('');
    try { onTranslated(await translateQuestToRussian(plan)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось перевести карту.'); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!needsTranslation || attempted.current.has(plan.id)) return;
    attempted.current.add(plan.id);
    void translate();
  }, [plan.id, needsTranslation]);

  if (!needsTranslation && !busy && !error) return null;
  return <div className="quest-translation" role="status">
    {busy ? 'Переводим карту на русский, сохраняя твой прогресс…' : <>
      {error && <p>{error}</p>}
      <button className="secondary-button" onClick={() => void translate()}>Перевести карту на русский</button>
    </>}
  </div>;
}

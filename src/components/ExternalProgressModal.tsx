import { useState } from 'react';
import type { AiQuestPlan } from '../lib/aiQuest';
import { adaptFromExternalProgress } from '../lib/externalQuestProgress';

export function ExternalProgressModal({ userId, plan, onClose, onAdapted }: {
  userId: string; plan: AiQuestPlan; onClose: () => void; onAdapted: (plan: AiQuestPlan) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  async function adapt() {
    if (text.trim().length < 10 || busy) return;
    setBusy(true); setError('');
    const result = await adaptFromExternalProgress(userId, plan, text);
    if (result.data) { onAdapted(result.data); setReply(result.reply); }
    else setError(result.error?.message ?? 'Не удалось адаптировать карту.');
    setBusy(false);
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="social-modal external-progress-modal"
    onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose}>×</button>
    <span className="external-progress-icon">✨</span><small>ПРОГРЕСС ВНЕ ПРИЛОЖЕНИЯ</small>
    <h2>Расскажи Кью, что уже сделано</h2>
    <p>Напиши, что ты изучил, попробовал или закончил самостоятельно. Кью уберёт повторы и обновит следующие этапы карты «{plan.map_title}».</p>
    {!reply && <><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={5000}
      placeholder="Например: я уже поговорила с пятью пользователями, выбрала главную проблему и сделала первый прототип…" />
      <div className="external-progress-prompts"><span>Что сделал?</span><span>Что получилось?</span><span>Что было трудно?</span></div>
      <button className="social-primary" disabled={busy || text.trim().length < 10} onClick={() => void adapt()}>
        {busy ? 'Кью изучает прогресс…' : 'Сохранить и адаптировать карту'}</button></>}
    {reply && <div className="external-progress-reply"><b>Кью:</b><p>{reply}</p>
      <button className="social-primary" onClick={onClose}>Посмотреть обновлённую карту</button></div>}
    {error && <p className="form-error">{error}</p>}
  </section></div>;
}

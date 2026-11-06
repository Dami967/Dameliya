import { useState } from 'react';
import { Link } from 'wouter';
import type { QuestStep } from '../lib/questData';

export function MapPracticeStop({ steps, planId, preview = false }: { steps: QuestStep[]; planId?: string; preview?: boolean }) {
  const completed = steps.filter((step) => step.state === 'done');
  const [selected, setSelected] = useState<number | null>(null);
  const step = preview
    ? steps.find((item) => item.id === selected) ?? steps.find((item) => item.state === 'active') ?? steps[0]
    : completed.find((item) => item.id === selected) ?? completed[completed.length - 1];
  return <section className="map-practice-stop">
    <div><b>🎮 Закрепи навык</b><p>{preview ? 'Режим предпросмотра создателя.' : step ? 'Выбери этап и способ повторения.' : 'Выполни первое задание — здесь откроются игры.'}</p></div>
    {step && planId ? <>
      <label>Этап<select value={step.id} onChange={(event) => setSelected(Number(event.target.value))}>
        {(preview ? steps : completed).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      <div className="map-practice-actions"><Link href={`/review/${planId}/${step.id}${preview ? '?preview=1' : ''}`}>✓ Викторина</Link>
        <Link href={`/review/${planId}/${step.id}?mode=cards${preview ? '&preview=1' : ''}`}>▤ Карточки</Link></div>
    </> : <div className="map-practice-actions"><button disabled>🔒 Викторина</button><button disabled>🔒 Карточки</button></div>}
  </section>;
}

import { useState } from 'react';

const subjects = [
  { name: 'Математика', prompt: 'Какую тему и для какого класса?', example: 'Степени и дроби, 7 класс' },
  { name: 'Стартап', prompt: 'Какую идею хочешь развить и до какого результата?', example: 'Проверить идею приложения и найти первых пользователей' },
  { name: 'Английский', prompt: 'Какой уровень сейчас и чего хочешь достичь?', example: 'С A2 до B1, научиться говорить о работе' },
  { name: 'Другой язык', prompt: 'Какой именно язык, уровень и цель?', example: 'Итальянский с нуля для путешествий' },
  { name: 'Творчество', prompt: 'Какой навык хочешь освоить?', example: 'Научиться рисовать портреты карандашом' },
  { name: 'Другое', prompt: 'Опиши свою цель', example: 'Хочу открыть свою кофейню' },
];

export function GoalInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [subject, setSubject] = useState<string | null>(null);
  const selected = subjects.find((item) => item.name === subject);
  return <div className="goal-input">
    <span>Выбери направление или напиши свою цель</span>
    <div className="goal-subjects">{subjects.map((item) => <button type="button" key={item.name}
      aria-pressed={subject === item.name} onClick={() => { setSubject(item.name); }}>
      {item.name}</button>)}</div>
    {selected && selected.name !== 'Другое' && <label>{selected.prompt}
      <input key={selected.name} placeholder={selected.example} onChange={(event) =>
        onChange(`${selected.name === 'Другой язык' ? '' : `${selected.name}: `}${event.target.value}`)} /></label>}
    <label>Твоя цель — можно изменить любое слово
      <textarea value={value} onChange={(event) => onChange(event.target.value)} maxLength={300}
        placeholder={selected?.example ?? 'Например: освоить итальянский с нуля для путешествий'} /></label>
    {value && <button type="button" onClick={() => { onChange(''); setSubject(null); }}>Очистить цель</button>}
  </div>;
}

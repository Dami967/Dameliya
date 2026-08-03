import type { QuestStep, QuestTaskDetails } from '../lib/questData';

export function LinkedTaskText({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s<>"']+)/gi);
  return <>{parts.map((part, index) => part.startsWith('https://')
    ? <a className="task-inline-link" href={part.replace(/[),.;!?]+$/g, '')}
      target="_blank" rel="noreferrer" key={`${part}-${index}`}>{part}</a>
    : part)}</>;
}

export function defaultTaskDetails(step: QuestStep): QuestTaskDetails {
  return { objective: step.subtitle, expected_answer: `Конкретный результат этапа «${step.title}», выполненный по всем трём пунктам.`,
    duration_minutes: 25, category: 'Практика', resources: [], checklist: [
    { title: 'Определи результат', hint: `Запиши ожидаемый итог этапа «${step.title}».` },
    { title: 'Выполни основной шаг', hint: 'Сосредоточься на одном небольшом измеримом результате.' },
    { title: 'Зафиксируй итог', hint: 'Сохрани результат и отметь, что получилось.' },
  ] };
}

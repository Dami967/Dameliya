import { Link } from 'wouter';
import type { QuestStep } from '../lib/questData';
import type { TaskRecord } from '../lib/taskRecords';

export function CompletedTaskChoice({ step, record, onHistory, onReplay }: {
  step: QuestStep; record: TaskRecord | null; onHistory: () => void; onReplay: () => void;
}) {
  return <main className="completed-task-choice"><section>
    <span>✓</span><small>ПРОЙДЕННЫЙ ЭТАП</small><h1>{step.title}</h1>
    <p>Этот этап уже выполнен и останется отмеченным на карте. Можно посмотреть сохранённые материалы или пройти его ещё раз.</p>
    {record?.completed_at && <time>Выполнено {new Date(record.completed_at).toLocaleDateString('ru-RU')}</time>}
    <div><button onClick={onHistory}>Посмотреть записи и материалы</button>
      <button onClick={onReplay}>Пройти урок заново</button></div>
    <Link href="/quest">← Вернуться к карте</Link>
  </section></main>;
}

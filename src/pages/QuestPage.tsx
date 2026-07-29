import { AppShell } from '../components/AppShell';
import { QuestMap } from '../components/QuestMap';
import { Icon } from '../components/Icon';

export function QuestPage() {
  return (
    <AppShell>
      <header className="page-header">
        <div><span className="eyebrow">МОЙ КВЕСТ</span><h1>Запустить свой первый стартап</h1>
          <p>Большая цель становится простой, когда виден следующий шаг.</p></div>
        <button className="icon-button" aria-label="Настройки"><Icon name="target" /></button>
      </header>
      <div className="quest-page-grid">
        <QuestMap />
        <aside className="goal-summary">
          <div className="summary-orb"><Icon name="rocket" size={34} /></div>
          <h3>Твой прогресс</h3>
          <div className="big-progress">20<span>%</span></div>
          <div className="summary-row"><span>Заданий готово</span><b>2 / 10</b></div>
          <div className="summary-row"><span>Заработано</span><b>150 XP</b></div>
          <div className="summary-row"><span>Время в пути</span><b>7 дней</b></div>
          <button className="secondary-button"><Icon name="sparkles" size={18} /> Изменить план с AI</button>
        </aside>
      </div>
    </AppShell>
  );
}

import { Icon } from './Icon';

const expeditions = [
  { icon: '🚀', title: 'Стартап', subtitle: 'Создай первый продукт', progress: 40, reward: 'Эпический костюм', active: true },
  { icon: '🔬', title: 'Исследование', subtitle: 'Проверь 5 гипотез', progress: 18, reward: 'Редкий сундук', active: false },
  { icon: '📚', title: 'Обучение', subtitle: 'Освой новый навык', progress: 72, reward: 'Тема «Библиотека»', active: false },
  { icon: '🎓', title: 'Поступление', subtitle: 'Подготовь портфолио', progress: 10, reward: 'Медаль абитуриента', active: false },
  { icon: '🌍', title: 'Путешествие', subtitle: 'Спланируй маршрут мечты', progress: 0, reward: 'Компас искателя', active: false },
];

export function ExpeditionsPanel() {
  return (
    <div className="expeditions-layout">
      <section className="active-expedition">
        <div><span className="eyebrow">АКТИВНАЯ ЭКСПЕДИЦИЯ</span><h2>🚀 Стартап: первый запуск</h2>
          <p>Персонаж движется вперёд только когда ты выполняешь реальные задания.</p></div>
        <div className="expedition-scene"><span>🏕️</span><i>🧑‍🚀</i><b>🦅</b><em>🚀</em></div>
        <div className="expedition-track"><span style={{ width: '40%' }} /><i style={{ left: '40%' }}>✦</i></div>
        <div className="expedition-stats"><span><b>4/10</b><small>этапов</small></span><span><b>380 XP</b><small>заработано</small></span>
          <span><b>12 ч</b><small>реальной работы</small></span></div>
        <button className="primary-button">Продолжить задания <Icon name="arrow" size={16} /></button>
      </section>
      <section className="expedition-list"><div className="section-heading"><h2>Все экспедиции</h2><span className="progress-pill">1 активна</span></div>
        {expeditions.map((item) => <article className={item.active ? 'is-active' : ''} key={item.title}>
          <span className="expedition-icon">{item.icon}</span><div><b>{item.title}</b><small>{item.subtitle}</small>
            <span className="mini-track"><i style={{ width: `${item.progress}%` }} /></span></div>
          <span className="expedition-reward"><small>Награда</small><b>{item.reward}</b></span>
        </article>)}
      </section>
    </div>
  );
}

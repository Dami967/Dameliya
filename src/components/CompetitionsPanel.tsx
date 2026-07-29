import { Icon } from './Icon';

const friends = [
  { place: 1, name: 'Дамелия', avatar: 'Д', value: '1 240 XP', progress: 92, current: true },
  { place: 2, name: 'Алихан', avatar: 'А', value: '1 090 XP', progress: 81 },
  { place: 3, name: 'София', avatar: 'С', value: '860 XP', progress: 64 },
  { place: 4, name: 'Марк', avatar: 'М', value: '710 XP', progress: 53 },
];

export function CompetitionsPanel() {
  return (
    <div className="competitions-layout">
      <section className="competition-main">
        <header><div><span className="live-dot">Идёт сейчас</span><h2>Космическая неделя</h2>
          <p>Кто заработает больше XP, выполняя свои задачи?</p></div><span className="competition-cup">🏆</span></header>
        <div className="competition-timer"><span><b>2</b><small>дня</small></span><i>:</i><span><b>14</b><small>часов</small></span>
          <i>:</i><span><b>32</b><small>минуты</small></span></div>
        <div className="leaderboard">{friends.map((friend) => <div className={friend.current ? 'is-current' : ''} key={friend.name}>
          <b className="place">{friend.place}</b><span className="friend-avatar">{friend.avatar}</span>
          <span className="friend-name"><b>{friend.name}</b><i><em style={{ width: `${friend.progress}%` }} /></i></span>
          <strong>{friend.value}</strong>
        </div>)}</div>
      </section>
      <aside className="competition-side">
        <section className="prize-card"><span className="eyebrow">ПРИЗОВОЙ ФОНД</span><div>🎁</div><h3>Эпический сундук</h3>
          <p>Эксклюзивная рамка профиля, 300 XP и редкий аксессуар.</p></section>
        <section className="challenge-card"><div className="section-heading"><h2>Новый вызов</h2><Icon name="plus" size={17} /></div>
          <p>Позови друга и выбери честную цель для соревнования.</p>
          <div className="challenge-types"><span>🎯 Первым к цели</span><span>✅ Больше заданий</span><span>🔥 Дольше серия</span></div>
          <button className="secondary-button">Создать соревнование</button>
        </section>
      </aside>
    </div>
  );
}

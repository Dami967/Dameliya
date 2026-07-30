import { Link } from 'wouter';
import { AppShell } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { AiTip, QuickActions, TodayTasks, WeekProgress } from '../components/HomeWidgets';

export function HomePage() {
  return (
    <AppShell>
      <header className="topbar">
        <div><p>Твоё новое приключение</p><h1>Привет, Дамелия! <span>👋</span></h1></div>
        <div className="top-stats">
          <span className="stat-chip stat-chip--fire"><Icon name="flame" size={19} />7</span>
          <span className="stat-chip stat-chip--xp"><Icon name="gem" size={19} />1 240</span>
          <div className="avatar">Д</div>
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-card__mascot">
          <img src="/goalquest-eagle-quest.png" alt="Орлёнок GoalQuest" />
        </div>
        <div className="hero-card__copy">
          <span className="eyebrow">ГЛАВНЫЙ КВЕСТ</span>
          <h2>Преврати мечту в приключение!</h2>
          <p>Орлёнок Кью ждёт тебя на следующем этапе. Ещё один шаг — и новая награда твоя.</p>
          <div className="hero-progress"><span /></div>
          <small>2 из 10 этапов пройдено</small>
        </div>
        <Link href="/task" className="primary-button">Вперёд <Icon name="arrow" size={18} /></Link>
      </section>

      <QuickActions />
      <div className="home-overview">
        <TodayTasks />
        <div className="home-overview__side"><AiTip /><WeekProgress /></div>
      </div>

      <aside className="dashboard-side dashboard-side--home">
          <section className="daily-card">
            <div className="daily-card__icon"><Icon name="sparkles" size={25} /></div>
            <div><span className="eyebrow">ЗАДАНИЕ ДНЯ</span><h3>Изучи своих конкурентов</h3>
              <p>Найди 3 похожих проекта и выпиши, чем твоя идея будет лучше.</p></div>
            <div className="daily-meta"><span><Icon name="clock" size={17} />25 мин</span><span><Icon name="zap" size={17} />+100 XP</span></div>
            <Link href="/task" className="dark-button">Начать задание</Link>
          </section>
          <section className="streak-card">
            <div className="streak-head"><span className="flame-circle"><Icon name="flame" /></span>
              <div><small>ТВОЯ СЕРИЯ</small><h3>7 дней подряд!</h3></div></div>
            <div className="week-row">
              {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((day, i) => (
                <div key={day} className={i < 7 ? 'checked' : ''}><span><Icon name="check" size={13} /></span><small>{day}</small></div>
              ))}
            </div>
          </section>
          <section className="mentor-mini">
            <span className="mentor-avatar">AI</span>
            <div><b>Нужна помощь?</b><p>Твой AI-наставник всегда рядом</p></div>
            <Link href="/mentor" aria-label="Открыть чат с AI"><Icon name="message" size={21} /></Link>
          </section>
      </aside>
    </AppShell>
  );
}

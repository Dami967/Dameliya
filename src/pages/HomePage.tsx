import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { AppShell } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { AiTip, QuickActions, TodayTasks, WeekProgress } from '../components/HomeWidgets';
import { loadAiQuests, type AiQuestPlan } from '../lib/aiQuest';
import { useSession } from '../lib/useSession';
import { UserBalance } from '../components/UserBalance';

export function HomePage() {
  const { session } = useSession();
  const [plans, setPlans] = useState<AiQuestPlan[]>([]);
  const [planIndex, setPlanIndex] = useState(0);
  useEffect(() => {
    if (session) void loadAiQuests(session.user.id).then(({ data }) => setPlans(data ?? []));
  }, [session]);
  const plan = plans[planIndex] ?? null;
  const active = plan?.steps.find((step) => step.state === 'active');
  const done = plan?.steps.filter((step) => step.state === 'done').length ?? 0;
  const total = plan?.steps.length ?? 0;
  const taskUrl = active ? `/task/${active.id}?plan=${plan?.id}` : '/mentor?new=1';
  return (
    <AppShell>
      <header className="topbar">
        <div><p>Твоё новое приключение</p><h1>Привет, Дамелия! <span>👋</span></h1></div>
        <div className="top-stats">
          <UserBalance />
          <div className="avatar">Д</div>
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-card__mascot">
          <img src="/goalquest-eagle-quest.png" alt="Орлёнок GoalQuest" />
        </div>
        <div className="hero-card__copy">
          <span className="eyebrow">ГЛАВНЫЙ КВЕСТ</span>
          <h2>{plan?.goal || 'Преврати мечту в приключение!'}</h2>
          <p>{active ? `Следующий шаг: ${active.title}` : 'Расскажи Кью о цели, и он создаст персональный маршрут.'}</p>
          <div className="hero-progress"><span style={{ width: `${total ? done / total * 100 : 0}%` }} /></div>
          <small>{done} из {total || 10} этапов пройдено</small>
        </div>
        <div className="hero-quest-actions">
          {plans.length > 1 && <div className="hero-quest-switcher">
            <button onClick={() => setPlanIndex((planIndex - 1 + plans.length) % plans.length)}
              aria-label="Предыдущий квест">←</button><span>{planIndex + 1} / {plans.length}</span>
            <button onClick={() => setPlanIndex((planIndex + 1) % plans.length)} aria-label="Следующий квест">→</button>
          </div>}
          <Link href={taskUrl} className="primary-button">{active ? 'Продолжить' : 'Создать цель'} <Icon name="arrow" size={18} /></Link>
        </div>
      </section>

      <QuickActions />
      <div className="home-overview">
        <TodayTasks plan={plan} />
        <div className="home-overview__side"><AiTip goal={plan?.goal} /><WeekProgress /></div>
      </div>

      <aside className="dashboard-side dashboard-side--home">
          <section className="daily-card">
            <div className="daily-card__icon"><Icon name="sparkles" size={25} /></div>
            <div><span className="eyebrow">ЗАДАНИЕ ДНЯ</span><h3>{active?.title || 'Выбери новую цель'}</h3>
              <p>{active?.details?.objective || active?.subtitle || 'Кью подготовит задание именно под твою цель и доступное время.'}</p></div>
            <div className="daily-meta"><span><Icon name="clock" size={17} />{active?.details?.duration_minutes ?? 25} мин</span>
              <span><Icon name="zap" size={17} />+{active?.xp ?? 50} XP</span></div>
            <Link href={taskUrl} className="dark-button">{active ? 'Начать задание' : 'Создать цель'}</Link>
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

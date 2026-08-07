import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { AppShell } from '../components/AppShell';
import { DressedEagle } from '../components/DressedEagle';
import { Icon } from '../components/Icon';
import { rewards, type Reward } from '../lib/rewardsData';
import { loadUserRewards } from '../lib/userRewards';
import { useSession } from '../lib/useSession';
import { loadProfile, type UserProfile, xpProgress } from '../lib/userProfile';
import { loadHomeProgress } from '../lib/homeProgress';

export function ProfilePage() {
  const { session, loading } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [equipped, setEquipped] = useState<Reward[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!session) return;
    void Promise.all([loadProfile(session.user.id), loadUserRewards(session.user.id), loadHomeProgress(session.user.id)])
      .then(([profileResult, rewardResult, progress]) => {
      setProfile(profileResult.data);
      setStreak(progress.streak);
      const ids = (rewardResult.data ?? []).filter((item) => item.equipped).map((item) => item.reward_id);
      setEquipped(rewards.filter((reward) => ids.includes(reward.id)));
    });
  }, [session]);

  if (loading) return <main className="center-loader">Загружаем профиль…</main>;
  if (!session) return <GuestProfile />;
  if (!profile) return <main className="center-loader">Готовим профиль…</main>;

  const completion = profile.completed_goals
    ? Math.min(100, Math.round((profile.completed_goals / Math.max(profile.completed_goals + 2, 1)) * 100))
    : 0;
  const achievements = [
    { icon: 'flame', title: streak >= 7 ? '7 дней в пути' : `${streak} / 7 дней`, tone: 'orange', unlocked: streak >= 7 },
    { icon: 'target', title: 'Первый шаг', tone: 'blue', unlocked: profile.completed_tasks > 0 },
    { icon: 'zap', title: 'На волне', tone: 'purple', unlocked: profile.momentum >= 100 },
  ];

  return (
    <AppShell>
      <header className="page-header profile-page-head">
        <div><span className="eyebrow">ПРОФИЛЬ</span><h1>Твой герой</h1><p>Каждый маленький шаг делает тебя сильнее.</p></div>
        <Link href="/settings" className="icon-button" aria-label="Настройки"><Icon name="settings" /></Link>
      </header>
      <section className="profile-hero">
        <Avatar profile={profile} equipped={equipped} />
        <div className="profile-copy">
          <span className="profile-username">@{profile.username || 'goal_seeker'}</span>
          <h2>{profile.display_name || 'Искатель целей'}</h2>
          <p>{profile.bio || 'Пишу свою историю — одна цель за другой ✨'}</p>
          <div className="level-bar"><span style={{ width: `${xpProgress(profile)}%` }} /></div>
          <small>{profile.xp} XP · прогресс до {profile.level + 1} уровня</small>
        </div>
        <Link href="/profile/edit" className="secondary-button">Редактировать</Link>
      </section>
      <section className="profile-stats">
        <Stat icon="target" value={`${completion}%`} label="целей завершено" tone="blue" />
        <Stat icon="check" value={profile.completed_tasks.toString()} label="заданий выполнено" tone="mint" />
        <Stat icon="clock" value={`${Math.round(profile.learning_minutes / 60)} ч`} label="время обучения" tone="purple" />
        <Stat icon="flame" value={streak.toString()} label="дней подряд" tone="orange" />
        <Stat icon="zap" value={profile.momentum.toString()} label="AI Momentum" tone="pink" />
      </section>
      <div className="profile-grid">
        <section className="profile-section">
          <div className="section-heading"><h2>Достижения</h2><span className="link-label">Уровень {profile.level}</span></div>
          <div className="achievement-list">{achievements.map((item) => (
            <div className={`achievement achievement--${item.tone} ${item.unlocked ? '' : 'is-locked'}`} key={item.title}>
              <span><Icon name={item.icon} /></span><b>{item.title}</b>
            </div>
          ))}</div>
        </section>
        <section className="profile-section"><h2>О тебе</h2>
          <Info icon="star" label="Интересы" value={profile.interests.join(', ') || 'Пока не указаны'} />
          <Info icon="target" label="Главная цель" value={profile.main_goals[0] || 'Добавь свою первую цель'} />
          <Info icon="clock" label="Ритм" value={`${profile.daily_minutes} минут в день`} />
          <Info icon="map" label="Страна и занятие" value={[profile.country, profile.occupation].filter(Boolean).join(' · ') || 'Не указано'} />
          <p className="member-since">В GoalQuest с {new Date(profile.created_at).toLocaleDateString('ru-RU')}</p>
        </section>
      </div>
    </AppShell>
  );
}

function Avatar({ profile, equipped }: { profile: UserProfile; equipped: Reward[] }) {
  return <div className="profile-avatar profile-avatar--eagle">
    {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : equipped.length
      ? <DressedEagle equipped={equipped} size="profile" />
      : <img src="/goalquest-eagle.png" alt="Орлёнок Кью" />}
    <span>{profile.level}</span>
  </div>;
}
function Stat({ icon, value, label, tone }: { icon: string; value: string; label: string; tone: string }) {
  return <div className={`profile-stat profile-stat--${tone}`}><Icon name={icon} /><div><b>{value}</b><small>{label}</small></div></div>;
}
function Info({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="info-row"><Icon name={icon} /><span><small>{label}</small><b>{value}</b></span></div>;
}
function GuestProfile() {
  return <main className="empty-state"><Icon name="user" size={40} /><h1>Создай свой профиль</h1>
    <p>Войди или зарегистрируйся, чтобы сохранять прогресс и достижения.</p>
    <Link href="/auth?mode=signup&entry=app" className="primary-button">Создать аккаунт</Link></main>;
}

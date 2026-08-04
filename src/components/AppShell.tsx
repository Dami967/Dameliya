import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Icon } from './Icon';
import { FloatingMentor } from './FloatingMentor';
import { MomentumCard } from './MomentumCard';
import { useSession } from '../lib/useSession';
import { currentUserName, useCurrentProfile } from '../lib/useCurrentProfile';
import { ReminderManager } from './ReminderManager';
import { NotificationBell } from './NotificationBell';
import { GlobalCallManager } from './GlobalCallManager';

type AppShellProps = { children: React.ReactNode };

const navigation = [
  { href: '/home', icon: 'home', label: 'Главная' },
  { href: '/quest', icon: 'map', label: 'Мой квест' },
  { href: '/notes', icon: 'book', label: 'Заметки' },
  { href: '/rewards', icon: 'trophy', label: 'Награды' },
  { href: '/friends', icon: 'users', label: 'Друзья' },
  { href: '/settings', icon: 'settings', label: 'Настройки' },
];

export function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const [compactNavigation, setCompactNavigation] = useState(() => window.matchMedia('(max-width: 920px)').matches);
  const { session } = useSession();
  const profile = useCurrentProfile(session?.user.id);
  const displayName = currentUserName(session?.user, profile);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 920px)');
    const update = () => setCompactNavigation(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/home" className="brand">
          <span className="brand__mark"><Icon name="star" size={20} /></span>
          <span>GoalQuest</span>
        </Link>
        <nav className="nav-list">
          {navigation.map((item) => <div className="nav-item-cell" key={item.href}>
            <Link href={item.href}
              className={`nav-item ${location === item.href || location.startsWith(`${item.href}/`) ? 'is-active' : ''}`}>
              <Icon name={item.icon} size={21} /><span>{item.label}</span>
            </Link>
            {item.href === '/friends' && session && !compactNavigation && <NotificationBell userId={session.user.id} />}
          </div>)}
        </nav>
        <MomentumCard />
        <Link href="/profile" className={`sidebar-user ${location === '/profile' ? 'is-active' : ''}`}>
          <div className="avatar" data-no-auto-translate>{profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" /> : displayName[0]?.toUpperCase() || 'G'}</div>
          <div><b data-no-auto-translate>{profile?.username ? `@${profile.username}` : displayName}</b><small>Уровень {profile?.level ?? 1}</small></div>
          <Icon name="arrow" size={16} />
        </Link>
      </aside>
      <main className="main-content">{children}</main>
      <nav className="bottom-nav">
        {navigation.map((item) => <div className="nav-item-cell" key={item.href}>
          <Link href={item.href} className={location === item.href || location.startsWith(`${item.href}/`) ? 'is-active' : ''}>
            <Icon name={item.icon} size={21} /><span>{item.label}</span>
          </Link>
          {item.href === '/friends' && session && compactNavigation && <NotificationBell userId={session.user.id} />}
        </div>)}
      </nav>
      <FloatingMentor />
      {session && <GlobalCallManager userId={session.user.id} />}
      {session && <ReminderManager userId={session.user.id} />}
    </div>
  );
}

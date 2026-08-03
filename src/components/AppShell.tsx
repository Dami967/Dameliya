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
  const { session } = useSession();
  const profile = useCurrentProfile(session?.user.id);
  const displayName = currentUserName(session?.user, profile);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/home" className="brand">
          <span className="brand__mark"><Icon name="star" size={20} /></span>
          <span>GoalQuest</span>
        </Link>
        <nav className="nav-list">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}
              className={`nav-item ${location === item.href || location.startsWith(`${item.href}/`) ? 'is-active' : ''}`}>
              <Icon name={item.icon} size={21} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <MomentumCard />
        <Link href="/profile" className={`sidebar-user ${location === '/profile' ? 'is-active' : ''}`}>
          <div className="avatar" data-no-auto-translate>{displayName[0]?.toUpperCase() || 'G'}</div>
          <div><b data-no-auto-translate>{profile?.username ? `@${profile.username}` : displayName}</b><small>Уровень {profile?.level ?? 1}</small></div>
          <Icon name="arrow" size={16} />
        </Link>
      </aside>
      {session && <div className="global-notifications"><NotificationBell userId={session.user.id} /></div>}
      <main className="main-content">{children}</main>
      <nav className="bottom-nav">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className={location === item.href || location.startsWith(`${item.href}/`) ? 'is-active' : ''}>
            <Icon name={item.icon} size={21} /><span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <FloatingMentor />
      {session && <GlobalCallManager userId={session.user.id} />}
      {session && <ReminderManager userId={session.user.id} />}
    </div>
  );
}

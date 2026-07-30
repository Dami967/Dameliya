import { Link, useLocation } from 'wouter';
import { Icon } from './Icon';
import { FloatingMentor } from './FloatingMentor';

type AppShellProps = { children: React.ReactNode };

const navigation = [
  { href: '/home', icon: 'home', label: 'Главная' },
  { href: '/quest', icon: 'map', label: 'Мой квест' },
  { href: '/rewards', icon: 'trophy', label: 'Награды' },
  { href: '/friends', icon: 'users', label: 'Друзья' },
  { href: '/settings', icon: 'settings', label: 'Настройки' },
];

export function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
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
              className={`nav-item ${location === item.href ? 'is-active' : ''}`}>
              <Icon name={item.icon} size={21} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="momentum-card">
          <div className="momentum-card__top"><span><Icon name="zap" size={17} /> Momentum</span><b>72/100</b></div>
          <div className="meter"><span style={{ width: '72%' }} /></div>
          <small>+1 через 12 минут</small>
        </div>
        <Link href="/profile" className={`sidebar-user ${location === '/profile' ? 'is-active' : ''}`}>
          <div className="avatar">Д</div>
          <div><b>Дамелия</b><small>Уровень 6</small></div>
          <Icon name="arrow" size={16} />
        </Link>
      </aside>
      <main className="main-content">{children}</main>
      <nav className="bottom-nav">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className={location === item.href ? 'is-active' : ''}>
            <Icon name={item.icon} size={21} /><span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <FloatingMentor />
    </div>
  );
}

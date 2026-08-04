import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Icon } from './Icon';
import { loadNotifications, markAllNotificationsRead, markNotificationRead,
  subscribeToNotifications, type AppNotification } from '../lib/notifications';
import { playNotificationSound, unlockNotificationSound } from '../lib/notificationSound';
import { showBrowserNotification } from '../lib/browserNotifications';

export function NotificationBell({ userId }: { userId: string }) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const refresh = useCallback(() => void loadNotifications(userId).then(({ data }) => setItems(data ?? [])), [userId]);
  useEffect(() => {
    const unlock = () => unlockNotificationSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    refresh();
    const channel = subscribeToNotifications(userId, (item) => {
      playNotificationSound(); refresh();
      void showBrowserNotification(item.title, item.body, item.link, item.id);
    });
    return () => { void channel.unsubscribe(); window.removeEventListener('pointerdown', unlock); };
  }, [refresh, userId]);
  const unread = items.filter((item) => !item.read_at).length;

  async function openItem(item: AppNotification) {
    if (!item.read_at) await markNotificationRead(item.id);
    setOpen(false); navigate(item.link); refresh();
  }
  async function readAll() { await markAllNotificationsRead(userId); refresh(); }

  return <div className="notification-bell">
    <button className="notification-bell__button" onClick={() => setOpen((value) => !value)} aria-label="Уведомления">
      <Icon name="bell" size={20} />{unread > 0 && <b>{Math.min(unread, 99)}</b>}
    </button>
    {open && <section className="notification-panel">
      <header><div><h2>Уведомления</h2><small>{unread ? `${unread} новых` : 'Новых пока нет'}</small></div>
        <button onClick={() => setOpen(false)} aria-label="Закрыть">×</button></header>
      <div className="notification-list">{items.map((item) => <button className={!item.read_at ? 'is-unread' : ''}
        key={item.id} onClick={() => void openItem(item)}>
        <span>{item.actor_avatar ? <img src={item.actor_avatar} alt="" />
          : item.kind === 'follow' ? '👤' : item.kind === 'competition' ? '🏆' : '💬'}</span>
        <div><b>{item.actor_name}</b><strong>{item.title}</strong><p>{item.body}</p><small>{relativeTime(item.created_at)}</small></div>
      </button>)}{!items.length && <p className="notification-empty">Здесь появятся новые подписчики и сообщения.</p>}</div>
      {unread > 0 && <button className="notification-read-all" onClick={() => void readAll()}>Отметить всё прочитанным</button>}
    </section>}
  </div>;
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} ч. назад` : `${Math.floor(hours / 24)} дн. назад`;
}

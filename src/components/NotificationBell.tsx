import { useDraggableNotification } from '../lib/useDraggableNotification';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Icon } from './Icon';
import { loadNotifications, markAllNotificationsRead, markNotificationRead,
  deleteAllNotifications, deleteNotification, subscribeToNotifications, type AppNotification } from '../lib/notifications';

export function NotificationBell({ userId }: { userId: string }) {
  const draggable = useDraggableNotification();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [clearError, setClearError] = useState('');
  const clearing = useRef(false);
  const requestVersion = useRef(0);
  const refresh = useCallback(() => {
    if (clearing.current) return;
    const version = ++requestVersion.current;
    void loadNotifications(userId).then(({ data }) => {
      if (version === requestVersion.current) setItems(data ?? []);
    });
  }, [userId]);
  useEffect(() => {
    refresh();
    const channel = subscribeToNotifications(userId, refresh);
    window.addEventListener('goalquest-notifications-changed', refresh);
    return () => { void channel.unsubscribe();
      window.removeEventListener('goalquest-notifications-changed', refresh); };
  }, [refresh, userId]);
  const unread = items.filter((item) => !item.read_at).length;

  async function openItem(item: AppNotification) {
    if (!item.read_at) await markNotificationRead(item.id);
    setOpen(false); navigate(notificationLink(item)); refresh();
  }
  async function readAll() { await markAllNotificationsRead(userId); refresh(); }
  async function removeItem(id: string) {
    requestVersion.current += 1;
    const { error } = await deleteNotification(id);
    if (!error) setItems((current) => current.filter((item) => item.id !== id));
  }
  async function clearAll() {
    if (clearing.current) return;
    clearing.current = true;
    setClearError('');
    const previous = items;
    requestVersion.current += 1;
    setItems([]);
    try {
      const { error } = await deleteAllNotifications(userId);
      if (error) throw error;
    } catch {
      setItems(previous);
      setClearError('Не удалось очистить уведомления. Попробуй ещё раз.');
    } finally { clearing.current = false; }
  }

  return <div className="notification-bell" style={draggable.style}>
    <button className="notification-bell__button" onClick={() => {
      if (draggable.shouldOpen()) setOpen((value) => !value);
    }} onPointerDown={draggable.onPointerDown} onPointerMove={draggable.onPointerMove}
      onPointerUp={draggable.onPointerUp} onPointerCancel={draggable.onPointerCancel}
      aria-label="Уведомления" aria-expanded={open} title="Нажми, чтобы открыть. На телефоне можно перетащить.">
      <Icon name="bell" size={20} />{unread > 0 && <b>{Math.min(unread, 99)}</b>}
    </button>
    {open && <section className="notification-panel">
      <header><div><h2>Уведомления</h2><small>{unread ? `${unread} новых` : 'Новых пока нет'}</small></div>
        <button onClick={() => setOpen(false)} aria-label="Закрыть">×</button></header>
      {clearError && <p role="alert">{clearError}</p>}
      <div className="notification-list">{items.map((item) => <article className={!item.read_at ? 'is-unread' : ''}
        key={item.id}><button className="notification-item" onClick={() => void openItem(item)}>
        <span>{item.actor_avatar ? <img src={item.actor_avatar} alt="" />
          : item.kind === 'follow' ? '👤' : item.kind === 'competition' ? '🏆' : '💬'}</span>
        <div><b>{item.actor_name}</b><strong>{item.title}</strong><p>{item.body}</p><small>{relativeTime(item.created_at)}</small></div>
      </button><button className="notification-delete" onClick={() => void removeItem(item.id)}
        aria-label="Удалить уведомление" title="Удалить">×</button></article>)}
        {!items.length && <p className="notification-empty">Здесь появятся новые подписчики и сообщения.</p>}</div>
      {!!items.length && <footer className="notification-actions">
        {unread > 0 && <button onClick={() => void readAll()}>Отметить всё прочитанным</button>}
        <button className="notification-clear" onClick={() => void clearAll()}>Очистить всё</button>
      </footer>}
    </section>}
  </div>;
}

function notificationLink(item: AppNotification) {
  return item.kind === 'message' && item.actor_id
    ? `/friends?chat=${encodeURIComponent(item.actor_id)}` : item.link;
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} ч. назад` : `${Math.floor(hours / 24)} дн. назад`;
}

import { useEffect, useState } from 'react';
import { loadActiveQuest } from '../lib/activeQuest';
import { loadHomeProgress } from '../lib/homeProgress';
import { loadSettings, type UserSettings } from '../lib/userProfile';
import { showBrowserNotification } from '../lib/browserNotifications';
import { isReminderTime } from '../lib/reminderSchedule';
import { supabase } from '../lib/supabase';

export function ReminderManager({ userId }: { userId: string }) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    let checking = false;
    let settings: UserSettings | null = null;
    const shown = new Set<string>();
    async function check() {
      if (!active || checking || !settings?.reminders) return;
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (!isReminderTime(settings.reminder_time, now)) return;
      const kind = settings.streak_notifications ? 'streak' : 'daily';
      const key = `scheduled-${today}`;
      if (shown.has(key)) return;
      checking = true;
      try {
        const [progress, quest] = await Promise.all([loadHomeProgress(userId), loadActiveQuest(userId)]);
        if (!active || !settings?.reminders || !isReminderTime(settings.reminder_time)) return;
        if (progress.completedToday > 0) { shown.add(key); return; }
        const step = quest.data?.steps.find((item) => item.state === 'active');
        const title = kind === 'streak' && progress.streak > 0 ? `Сохрани серию: ${progress.streak} дн. 🔥` : 'Время для твоей цели';
        const body = step ? `Продолжи «${step.title}». Даже небольшой шаг важен.` : 'Добавь цель и начни приключение.';
        const path = step && quest.data ? `/task/${step.id}?plan=${quest.data.id}` : '/mentor?new=1';
        const saved = await supabase.rpc('deliver_scheduled_reminder', {
          p_date: today, p_title: title, p_body: body, p_link: path });
        if (saved.error) return;
        if (!saved.data) { shown.add(key); return; }
        shown.add(key);
        if (!active) return;
        setMessage(`${title}. ${body}`);
        window.dispatchEvent(new Event('goalquest-notifications-changed'));
        if (settings.push_notifications) await showBrowserNotification(title, body, path, saved.data);
      } catch { /* Retry on next tick when the connection returns. */ }
      finally { checking = false; }
    }
    async function refresh() {
      const result = await loadSettings(userId);
      if (!active) return;
      settings = result.data;
      void check();
    }
    const tick = () => void check();
    const refreshSettings = () => { void refresh().catch(() => {}); };
    refreshSettings();
    const timer = window.setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('goalquest-settings-changed', refreshSettings);
    return () => {
      active = false; window.clearInterval(timer);
      window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('goalquest-settings-changed', refreshSettings);
    };
  }, [userId]);
  return message ? <aside className="reminder-toast" role="status"><span>{message}</span>
    <button aria-label="Закрыть" onClick={() => setMessage('')}>×</button></aside> : null;
}

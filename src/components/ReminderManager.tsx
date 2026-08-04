import { useEffect, useState } from 'react';
import { loadActiveQuest } from '../lib/activeQuest';
import { loadHomeProgress } from '../lib/homeProgress';
import { loadSettings } from '../lib/userProfile';
import { showBrowserNotification } from '../lib/browserNotifications';
import { playNotificationSound } from '../lib/notificationSound';

type ReminderManagerProps = { userId: string };

export function ReminderManager({ userId }: ReminderManagerProps) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timer: number | undefined;
    let active = true;

    async function scheduleReminder() {
      window.clearTimeout(timer);
      const { data: settings } = await loadSettings(userId);
      if (!active || !settings?.reminders) return;
      const delay = millisecondsUntil(settings.reminder_time);
      timer = window.setTimeout(() => void showReminder(settings.push_notifications, settings.reminder_time), delay);
    }

    async function showReminder(useNotification: boolean, reminderTime: string) {
      const today = new Date().toLocaleDateString('en-CA');
      const storageKey = `goalquest-reminder-${userId}-${today}`;
      if (window.localStorage.getItem(storageKey)) {
        timer = window.setTimeout(() => void showReminder(useNotification, reminderTime), millisecondsUntilTomorrow(reminderTime));
        return;
      }
      const [progress, quest] = await Promise.all([loadHomeProgress(userId), loadActiveQuest(userId)]);
      if (!active) return;
      timer = window.setTimeout(() => void showReminder(useNotification, reminderTime), millisecondsUntilTomorrow(reminderTime));
      if (progress.completedToday > 0) return;
      const activeStep = quest.data?.steps.find((step) => step.state === 'active');
      const body = activeStep
        ? `${progress.streak ? `Сохрани серию ${progress.streak} дн.! ` : ''}Продолжи урок «${activeStep.title}».`
        : 'Создай первую цель и начни своё приключение.';
      window.localStorage.setItem(storageKey, 'shown');
      setMessage(body);
      playNotificationSound();
      if (useNotification) await showBrowserNotification('GoalQuest напоминает 🔥', body,
        activeStep ? '/quest' : '/mentor', 'goalquest-daily');
    }

    window.addEventListener('goalquest-settings-changed', scheduleReminder);
    void scheduleReminder();
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.removeEventListener('goalquest-settings-changed', scheduleReminder);
    };
  }, [userId]);

  if (!message) return null;
  return <aside className="reminder-toast" role="status"><b>Пора сделать маленький шаг 🔥</b>
    <span>{message}</span><button type="button" aria-label="Закрыть" onClick={() => setMessage('')}>×</button></aside>;
}

function millisecondsUntil(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours || 0, minutes || 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function millisecondsUntilTomorrow(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const target = new Date();
  target.setDate(target.getDate() + 1);
  target.setHours(hours || 0, minutes || 0, 0, 0);
  return target.getTime() - Date.now();
}

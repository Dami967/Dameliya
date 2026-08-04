import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AppShell } from '../components/AppShell';
import { SettingsRow, SettingsSection, Toggle } from '../components/SettingsUi';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/useSession';
import { loadSettings, saveProfile, saveSettings, type UserSettings } from '../lib/userProfile';
import { appLanguages, rememberLanguage } from '../lib/languages';
import { AccountActionDialog, type AccountAction } from '../components/AccountActionDialog';
import { requestNotificationPermission, showBrowserNotification } from '../lib/browserNotifications';
import { playNotificationSound, unlockNotificationSound } from '../lib/notificationSound';

export function SettingsPage() {
  const { session } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [message, setMessage] = useState('');
  const [accountAction, setAccountAction] = useState<AccountAction | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [, navigate] = useLocation();

  useEffect(() => {
    if (session) void loadSettings(session.user.id).then(({ data }) => {
      setSettings(data);
      if (data) {
        applyTheme(data.theme);
        rememberLanguage(data.language);
      }
    });
  }, [session]);

  async function update(changes: Partial<UserSettings>) {
    if (!session || !settings) return;
    const next = { ...settings, ...changes };
    setSettings(next);
    if (changes.theme) applyTheme(changes.theme);
    if (changes.language) rememberLanguage(changes.language);
    const { error } = await saveSettings(session.user.id, changes);
    setMessage(error ? error.message : 'Сохранено ✓');
    if (!error) window.dispatchEvent(new Event('goalquest-settings-changed'));
  }
  async function changePushNotifications(enabled: boolean) {
    if (!enabled) return update({ push_notifications: false });
    if (!('Notification' in window)) {
      setMessage('Этот браузер не поддерживает уведомления.');
      return;
    }
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      setMessage('Разреши уведомления GoalQuest в настройках браузера.');
      return;
    }
    await update({ push_notifications: true, reminders: true });
    unlockNotificationSound(); playNotificationSound();
    await showBrowserNotification('GoalQuest', 'Напоминания включены 🔥', '/settings', 'goalquest-enabled');
  }
  async function changeReminders(enabled: boolean) {
    if (!enabled) return update({ reminders: false });
    if ('Notification' in window && Notification.permission !== 'granted') {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') return update({ reminders: true, push_notifications: true });
    }
    await update({ reminders: true });
  }
  async function testReminder() {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return setMessage('Разреши уведомления GoalQuest в настройках браузера.');
    unlockNotificationSound(); playNotificationSound();
    await showBrowserNotification('Проверка GoalQuest 🔥',
      'Всё работает! В выбранное время Кью напомнит о текущем задании.', '/quest', 'goalquest-test');
    setMessage('Тестовое уведомление отправлено ✓');
  }
  function openAccountAction(action: AccountAction) {
    setAccountError(''); setAccountAction(action);
  }

  async function runAccountAction(value: string) {
    if (!accountAction) return;
    setAccountBusy(true); setAccountError('');
    if (accountAction === 'email') {
      const { error } = await supabase.auth.updateUser({ email: value.trim().toLowerCase() });
      setAccountBusy(false);
      if (error) return setAccountError(error.message);
      setMessage('Письмо подтверждения отправлено на новый email.'); setAccountAction(null); return;
    }
    if (accountAction === 'password') {
      const { error } = await supabase.auth.updateUser({ password: value });
      setAccountBusy(false);
      if (error) return setAccountError(error.message);
      setMessage('Пароль изменён ✓'); setAccountAction(null); return;
    }
    if (accountAction === 'delete') {
      const { error } = await supabase.rpc('delete_own_account');
      if (error) { setAccountBusy(false); setAccountError(error.message); return; }
    }
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    setAccountBusy(false);
    if (error) return setAccountError(error.message);
    navigate('/auth');
  }
  async function clearChats() {
    if (!session || !window.confirm('Очистить всю историю чатов?')) return;
    setMessage((await supabase.from('chat_history').delete().eq('user_id', session.user.id)).error?.message ?? 'История очищена.');
  }
  async function restartAi() {
    if (!session || !window.confirm('Пройти AI-интервью заново?')) return;
    await saveProfile(session.user.id, { onboarding_completed: false });
    navigate('/onboarding');
  }
  if (!session || !settings) return <main className="center-loader">Загружаем настройки…</main>;
  return (
    <AppShell>
      <header className="page-header"><div><span className="eyebrow">GOALQUEST</span><h1>Настройки</h1>
        <p>Управляй аккаунтом и настрой приложение под себя.</p></div><span className="save-status">{message}</span></header>
      <div className="settings-layout">
        <SettingsSection icon="user" title="Аккаунт">
          <SettingsRow title="Изменить email" detail={session.user.email ?? 'Гостевой аккаунт'} onClick={() => openAccountAction('email')} />
          <SettingsRow title="Изменить пароль" onClick={() => openAccountAction('password')} />
          <SettingsRow title="Выйти" onClick={() => openAccountAction('logout')} />
          <SettingsRow title="Удалить аккаунт" danger onClick={() => openAccountAction('delete')} />
        </SettingsSection>
        <SettingsSection icon="sparkles" title="Оформление">
          <div className="theme-picker">{(['light', 'dark', 'system'] as const).map((theme) =>
            <button className={settings.theme === theme ? 'active' : ''} key={theme} onClick={() => update({ theme })}>
              {theme === 'light' ? '☀ Светлая' : theme === 'dark' ? '☾ Тёмная' : '◐ Системная'}
            </button>)}</div>
          <SettingsRow title="Язык приложения" detail="Интерфейс и ответы AI" trailing={
            <select value={settings.language} onChange={(e) => update({ language: e.target.value })}>
              {appLanguages.map((language) => <option value={language.code} key={language.code}>
                {language.nativeName} · {language.name}
              </option>)}
            </select>} />
        </SettingsSection>
        <SettingsSection icon="bell" title="Уведомления">
          <SettingsRow title="Напоминания" trailing={<Toggle checked={settings.reminders}
            onChange={(reminders) => void changeReminders(reminders)} />} />
          <SettingsRow title="Время напоминания" detail="По времени на этом устройстве" trailing={
            <input className="reminder-time" type="time" value={settings.reminder_time.slice(0, 5)}
              onChange={(event) => update({ reminder_time: event.target.value })} />} />
          <SettingsRow title="Push-уведомления" trailing={<Toggle checked={settings.push_notifications}
            onChange={(enabled) => void changePushNotifications(enabled)} />} />
          <SettingsRow title="Проверить уведомление" detail="Отправить тест со звуком сейчас" onClick={() => void testReminder()} />
          <SettingsRow title="Email-уведомления" trailing={<Toggle checked={settings.email_notifications} onChange={(email_notifications) => update({ email_notifications })} />} />
        </SettingsSection>
        <SettingsSection icon="zap" title="AI-наставник">
          <SettingsRow title="История чатов" detail="Твои разговоры с наставником" />
          <SettingsRow title="Очистить историю" onClick={clearChats} />
          <SettingsRow title="Перезапустить AI-профиль" onClick={restartAi} />
        </SettingsSection>
        <SettingsSection icon="shield" title="Privacy & Support">
          <SettingsRow title="Политика конфиденциальности" href="/privacy" />
          <SettingsRow title="Условия использования" href="/terms" />
          <SettingsRow title="Связаться с поддержкой" href="/support" />
          <SettingsRow title="Сообщить об ошибке" href="/report-bug" />
          <SettingsRow title="Оценить приложение" href="/rate" />
        </SettingsSection>
      </div>
      {accountAction && <AccountActionDialog action={accountAction} currentEmail={session.user.email ?? ''}
        busy={accountBusy} error={accountError} onClose={() => !accountBusy && setAccountAction(null)}
        onSubmit={(value) => void runAccountAction(value)} />}
    </AppShell>
  );
}

function applyTheme(theme: UserSettings['theme']) {
  document.documentElement.dataset.theme = theme;
}

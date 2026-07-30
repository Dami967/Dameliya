import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AppShell } from '../components/AppShell';
import { SettingsRow, SettingsSection, Toggle } from '../components/SettingsUi';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/useSession';
import { loadSettings, saveProfile, saveSettings, type UserSettings } from '../lib/userProfile';
import { appLanguages, rememberLanguage } from '../lib/languages';

export function SettingsPage() {
  const { session } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [message, setMessage] = useState('');
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
  }
  async function changeEmail() {
    const email = window.prompt('Новый email');
    if (email) setMessage((await supabase.auth.updateUser({ email })).error?.message ?? 'Письмо подтверждения отправлено.');
  }
  async function changePassword() {
    const password = window.prompt('Новый пароль (минимум 6 символов)');
    if (password) setMessage((await supabase.auth.updateUser({ password })).error?.message ?? 'Пароль изменён ✓');
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
  async function deleteAccount() {
    if (!window.confirm('Удалить аккаунт и все данные без возможности восстановления?')) return;
    const { error } = await supabase.rpc('delete_own_account');
    if (error) return setMessage(error.message);
    await supabase.auth.signOut();
    navigate('/auth');
  }

  if (!session || !settings) return <main className="center-loader">Загружаем настройки…</main>;
  return (
    <AppShell>
      <header className="page-header"><div><span className="eyebrow">GOALQUEST</span><h1>Настройки</h1>
        <p>Управляй аккаунтом и настрой приложение под себя.</p></div><span className="save-status">{message}</span></header>
      <div className="settings-layout">
        <SettingsSection icon="user" title="Аккаунт">
          <SettingsRow title="Изменить email" detail={session.user.email ?? 'Гостевой аккаунт'} onClick={changeEmail} />
          <SettingsRow title="Изменить пароль" onClick={changePassword} />
          <SettingsRow title="Выйти" onClick={() => void supabase.auth.signOut().then(() => navigate('/auth'))} />
          <SettingsRow title="Удалить аккаунт" danger onClick={deleteAccount} />
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
          <SettingsRow title="Напоминания" trailing={<Toggle checked={settings.reminders} onChange={(reminders) => update({ reminders })} />} />
          <SettingsRow title="Push-уведомления" trailing={<Toggle checked={settings.push_notifications} onChange={(push_notifications) => update({ push_notifications })} />} />
          <SettingsRow title="Email-уведомления" trailing={<Toggle checked={settings.email_notifications} onChange={(email_notifications) => update({ email_notifications })} />} />
        </SettingsSection>
        <SettingsSection icon="zap" title="AI-наставник">
          <SettingsRow title="История чатов" detail="Твои разговоры с наставником" />
          <SettingsRow title="Очистить историю" onClick={clearChats} />
          <SettingsRow title="Перезапустить AI-профиль" onClick={restartAi} />
        </SettingsSection>
        <SettingsSection icon="crown" title="Premium">
          <div className="premium-banner"><b>GoalQuest Premium</b><p>Больше Momentum и расширенные AI-возможности.</p><button onClick={() => setMessage('Premium скоро появится ✨')}>Купить Premium</button></div>
          <SettingsRow title="Управление подпиской" onClick={() => setMessage('У тебя пока нет активной подписки.')} />
        </SettingsSection>
        <SettingsSection icon="shield" title="Privacy & Support">
          <SettingsRow title="Политика конфиденциальности" href="/privacy" />
          <SettingsRow title="Условия использования" href="/terms" />
          <SettingsRow title="Связаться с поддержкой" href="/support" />
          <SettingsRow title="Сообщить об ошибке" href="/report-bug" />
          <SettingsRow title="Оценить приложение" href="/rate" />
        </SettingsSection>
      </div>
    </AppShell>
  );
}

function applyTheme(theme: UserSettings['theme']) {
  document.documentElement.dataset.theme = theme;
}

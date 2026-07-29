import { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { SupabaseSetupMessage } from './SupabaseSetupMessage';

type AuthProps = {
  initialMode?: 'signin' | 'signup';
  onSuccess: (isNew: boolean) => void;
};

export function Auth({ initialMode = 'signin', onSuccess }: AuthProps) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured) return <SupabaseSetupMessage />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const result = mode === 'signup'
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) return setMessage(translateError(result.error.message));
    if (mode === 'signup' && !result.data.session) {
      setMessage('Проверь почту и подтверди регистрацию ✨');
      return;
    }
    onSuccess(mode === 'signup');
  }

  async function social(provider: 'google' | 'apple') {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) {
      setMessage(translateError(error.message));
      setBusy(false);
    }
  }

  async function guest() {
    setBusy(true);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    error ? setMessage(translateError(error.message)) : onSuccess(true);
  }

  async function resetPassword() {
    if (!email) return setMessage('Сначала введи свой email.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    setMessage(error ? translateError(error.message) : 'Ссылка для восстановления отправлена на почту.');
  }

  return (
    <div className="auth-box">
      <span className="eyebrow">{mode === 'signin' ? 'С ВОЗВРАЩЕНИЕМ' : 'НОВОЕ ПРИКЛЮЧЕНИЕ'}</span>
      <h2>{mode === 'signin' ? 'Войти в GoalQuest' : 'Создать аккаунт'}</h2>
      <p>{mode === 'signin' ? 'Продолжи путь с того места, где остановилась.' : 'Начни свой персональный путь к большим целям.'}</p>
      <div className="social-auth">
        <button type="button" onClick={() => social('google')} disabled={busy}><b>G</b> Google</button>
        <button type="button" onClick={() => social('apple')} disabled={busy}><b>●</b> Apple</button>
      </div>
      <div className="auth-divider"><span>или через email</span></div>
      <form onSubmit={submit} className="auth-form">
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com" required /></label>
        <label>Пароль<input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Минимум 6 символов" minLength={6} required /></label>
        {mode === 'signin' && <button type="button" className="text-button" onClick={resetPassword}>Забыли пароль?</button>}
        <button className="auth-submit" disabled={busy}>{busy ? 'Подождите…' : mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}</button>
      </form>
      {message && <p className="auth-message" role="status">{message}</p>}
      <button className="auth-switch" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
      </button>
      <button className="guest-button" onClick={guest} disabled={busy}>Продолжить как гость</button>
      <small className="auth-terms">Продолжая, вы принимаете Условия использования и Политику конфиденциальности.</small>
    </div>
  );
}

function translateError(message: string) {
  if (message.includes('Invalid login')) return 'Неверный email или пароль.';
  if (message.includes('already registered')) return 'Аккаунт с таким email уже существует.';
  if (message.includes('Anonymous sign-ins')) return 'Гостевой вход нужно включить в настройках Supabase Auth.';
  return message;
}

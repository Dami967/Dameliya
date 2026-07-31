import { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { SupabaseSetupMessage } from './SupabaseSetupMessage';
import { appLanguages, detectLanguage, rememberLanguage } from '../lib/languages';
import { PasswordRecovery } from './PasswordRecovery';

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
  const [language, setLanguage] = useState(detectLanguage);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isSupabaseConfigured) return <SupabaseSetupMessage />;

  if (isRecovering) {
    return <PasswordRecovery initialEmail={email} onCancel={() => setIsRecovering(false)} />;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setMessage('Проверь email: перед @ не должно быть точки, пробела или другого лишнего символа.');
      return;
    }
    setBusy(true);
    setMessage('');
    const result = mode === 'signup'
      ? await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { language } },
        })
      : await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setBusy(false);
    if (result.error) return setMessage(translateError(result.error.message));
    rememberLanguage(language);
    if (mode === 'signup' && !result.data.session) {
      setMessage('Письмо отправлено. Нажми «Подтвердить email», а затем вернись в GoalQuest ✨');
      return;
    }
    onSuccess(mode === 'signup');
  }

  async function signInWithGoogle() {
    rememberLanguage(language);
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      setMessage(translateError(error.message));
      setBusy(false);
    }
  }

  async function guest() {
    setBusy(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (!error) {
      await supabase.auth.updateUser({ data: { language } });
      rememberLanguage(language);
    }
    setBusy(false);
    error ? setMessage(translateError(error.message)) : onSuccess(true);
  }

  return (
    <div className="auth-box">
      <span className="eyebrow">{mode === 'signin' ? 'С ВОЗВРАЩЕНИЕМ' : 'НОВОЕ ПРИКЛЮЧЕНИЕ'}</span>
      <h2>{mode === 'signin' ? 'Войти в GoalQuest' : 'Создать аккаунт'}</h2>
      <p>{mode === 'signin' ? 'Продолжи путь с того места, где остановилась.' : 'Начни свой персональный путь к большим целям.'}</p>
      <div className="social-auth">
        <button type="button" onClick={signInWithGoogle} disabled={busy}><b>G</b> Продолжить через Google</button>
      </div>
      <div className="auth-divider"><span>или через email</span></div>
      <form onSubmit={submit} className="auth-form">
        <label>Язык / Language
          <select value={language} onChange={(event) => {
            setLanguage(event.target.value);
            rememberLanguage(event.target.value);
          }}>
            {appLanguages.map((item) => <option key={item.code} value={item.code}>{item.nativeName} · {item.name}</option>)}
          </select>
          <small className="language-hint">Язык можно изменить до входа или регистрации.</small>
        </label>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com" required /></label>
        <label>Пароль<div className="password-input">
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 6 символов" minLength={6} required />
          <button type="button" onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? 'Скрыть' : 'Показать'}
          </button>
        </div></label>
        {mode === 'signin' && <button type="button" className="text-button" onClick={() => setIsRecovering(true)}>Забыли пароль?</button>}
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
  if (message === '{}' || message.toLowerCase().includes('email address') || message.toLowerCase().includes('email format')) {
    return 'Не удалось использовать этот email. Проверь адрес и убери лишнюю точку перед @.';
  }
  return message;
}

function isValidEmail(email: string) {
  const [local, domain, extra] = email.split('@');
  return !extra && Boolean(local && domain?.includes('.')) && !local.endsWith('.') && !local.includes('..') && !email.includes(' ');
}

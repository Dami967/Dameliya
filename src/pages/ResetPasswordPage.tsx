import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [message, setMessage] = useState('Проверяем ссылку…');
  const [busy, setBusy] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setIsReady(Boolean(data.session));
      if (!data.session) setMessage('Ссылка недействительна или уже устарела.');
      else setMessage('');
    });
  }, []);

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) return setMessage('Пароль должен содержать минимум 6 символов.');
    if (password !== repeatPassword) return setMessage('Пароли не совпадают.');
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) await supabase.auth.signOut();
    setBusy(false);
    if (error) return setMessage(error.message);
    setIsSaved(true);
  }

  return (
    <main className="reset-password-page">
      <section className="reset-password-card">
        <span className="auth-callback__logo">✦</span>
        <span className="eyebrow">GOALQUEST</span>
        <h1>{isSaved ? 'Пароль изменён!' : 'Создайте новый пароль'}</h1>
        {isSaved
          ? <><p>Теперь можно войти в аккаунт с новым паролем.</p><Link href="/auth?entry=app" className="auth-submit">Перейти ко входу</Link></>
          : isReady && <form className="auth-form" onSubmit={savePassword}>
            <label>Новый пароль<div className="password-input">
              <input type={showPasswords ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} autoFocus required />
              <button type="button" onClick={() => setShowPasswords((value) => !value)}>{showPasswords ? 'Скрыть' : 'Показать'}</button>
            </div></label>
            <label>Повторите пароль<div className="password-input">
              <input type={showPasswords ? 'text' : 'password'} value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} minLength={6} required />
              <button type="button" onClick={() => setShowPasswords((value) => !value)}>{showPasswords ? 'Скрыть' : 'Показать'}</button>
            </div></label>
            <button className="auth-submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить новый пароль'}</button>
          </form>}
        {message && <p className="auth-message" role="status">{message}</p>}
        {!isReady && !isSaved && <Link href="/auth?entry=app" className="auth-switch">Запросить новую ссылку</Link>}
      </section>
    </main>
  );
}

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
          ? <><p>Теперь можно войти в аккаунт с новым паролем.</p><Link href="/auth" className="auth-submit">Перейти ко входу</Link></>
          : isReady && <form className="auth-form" onSubmit={savePassword}>
            <label>Новый пароль<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} autoFocus required /></label>
            <label>Повторите пароль<input type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} minLength={6} required /></label>
            <button className="auth-submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить новый пароль'}</button>
          </form>}
        {message && <p className="auth-message" role="status">{message}</p>}
        {!isReady && !isSaved && <Link href="/auth" className="auth-switch">Запросить новую ссылку</Link>}
      </section>
    </main>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type PasswordRecoveryProps = {
  initialEmail: string;
  onCancel: () => void;
};

export function PasswordRecovery({ initialEmail, onCancel }: PasswordRecoveryProps) {
  const [email, setEmail] = useState(initialEmail);
  const [isSent, setIsSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  async function sendRecoveryEmail() {
    if (!email.trim()) return setMessage('Введи email, к которому привязан аккаунт.');
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return setMessage(recoveryError(error.message));
    setIsSent(true);
    setSecondsLeft(60);
    setMessage('Письмо отправлено. Проверь входящие и папку «Спам».');
  }

  return (
    <div className="password-recovery">
      <button type="button" className="password-recovery__back" onClick={onCancel}>← Вернуться ко входу</button>
      <span className="eyebrow">ВОССТАНОВЛЕНИЕ ДОСТУПА</span>
      <h2>{isSent ? 'Проверьте почту' : 'Забыли пароль?'}</h2>
      <p>{isSent
        ? `Мы отправили ссылку на ${email}. Откройте её, чтобы создать новый пароль.`
        : 'Отправим защищённую ссылку на почту, указанную при регистрации.'}</p>

      {!isSent && <div className="auth-form">
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)}
          placeholder="name@gmail.com" autoFocus /></label>
        <button type="button" className="auth-submit" disabled={busy} onClick={sendRecoveryEmail}>
          {busy ? 'Отправляем…' : 'Восстановить пароль'}
        </button>
      </div>}

      {isSent && <div className="recovery-sent">
        <span aria-hidden="true">✉️</span>
        <button type="button" className="resend-code" disabled={busy || secondsLeft > 0} onClick={sendRecoveryEmail}>
          {secondsLeft > 0 ? `Отправить снова через ${formatTime(secondsLeft)}` : 'Отправить письмо снова'}
        </button>
      </div>}
      {message && <p className="auth-message" role="status">{message}</p>}
    </div>
  );
}

function formatTime(seconds: number) {
  return `0:${seconds.toString().padStart(2, '0')}`;
}

function recoveryError(message: string) {
  if (message.includes('rate limit')) return 'Подождите до конца таймера перед новой отправкой.';
  return message;
}

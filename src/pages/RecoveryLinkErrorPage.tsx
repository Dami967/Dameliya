import { useLocation } from 'wouter';
import { PasswordRecovery } from '../components/PasswordRecovery';

export function RecoveryLinkErrorPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const expired = params.get('error_code') === 'otp_expired';
  const isRecoveryError = expired || params.get('error_description')?.toLowerCase().includes('email link');

  if (!isRecoveryError) return <main className="reset-password-page">
    <section className="reset-password-card recovery-error-card">
      <div className="recovery-link-warning" role="alert"><span aria-hidden="true">⚠️</span><div>
        <h1>Не удалось войти через Google</h1>
        <p>Google отменил вход или не смог вернуть аккаунт в GoalQuest. Попробуй войти ещё раз.</p>
      </div></div>
      <button type="button" className="auth-submit" onClick={() => navigate('/auth?entry=app')}>Повторить вход</button>
    </section>
  </main>;

  return <main className="reset-password-page">
    <section className="reset-password-card recovery-error-card">
      <div className="recovery-link-warning" role="alert">
        <span aria-hidden="true">⌛</span>
        <div>
          <h1>{expired ? 'Ссылка устарела' : 'Ссылка не сработала'}</h1>
          <p>{expired
            ? 'Ссылку уже использовали или срок её действия закончился. Запроси новое письмо ниже.'
            : 'Не удалось подтвердить восстановление. Запроси новую защищённую ссылку.'}</p>
        </div>
      </div>
      <PasswordRecovery initialEmail="" onCancel={() => navigate('/auth?entry=app')} />
    </section>
  </main>;
}

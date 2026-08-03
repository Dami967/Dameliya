import { FormEvent, useState } from 'react';

export type AccountAction = 'email' | 'password' | 'logout' | 'delete';

const copy: Record<AccountAction, { title: string; button: string }> = {
  email: { title: 'Изменить email', button: 'Отправить подтверждение' },
  password: { title: 'Изменить пароль', button: 'Сохранить пароль' },
  logout: { title: 'Выйти из аккаунта?', button: 'Выйти' },
  delete: { title: 'Удалить аккаунт?', button: 'Удалить навсегда' },
};

export function AccountActionDialog({ action, currentEmail, busy, error, onClose, onSubmit }: {
  action: AccountAction; currentEmail: string; busy: boolean; error: string;
  onClose: () => void; onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  const needsInput = action === 'email' || action === 'password' || action === 'delete';
  const valid = action === 'email' ? /^\S+@\S+\.\S+$/.test(value)
    : action === 'password' ? value.length >= 6 : action === 'delete' ? value === 'УДАЛИТЬ' : true;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid && !busy) onSubmit(value);
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><form className="social-modal settings-account-dialog"
    onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
    <button type="button" className="modal-close" onClick={onClose}>×</button>
    <span className="eyebrow">АККАУНТ</span><h2>{copy[action].title}</h2>
    {action === 'email' && <><p>Сейчас: {currentEmail}</p><input type="email" autoFocus value={value}
      onChange={(event) => setValue(event.target.value)} placeholder="Новый email" /></>}
    {action === 'password' && <input type="password" autoFocus minLength={6} value={value}
      onChange={(event) => setValue(event.target.value)} placeholder="Новый пароль — минимум 6 символов" />}
    {action === 'logout' && <p>Для возвращения понадобится снова войти в GoalQuest.</p>}
    {action === 'delete' && <><p>Все цели, записи, друзья и сообщения будут удалены без восстановления.</p>
      <label>Напиши УДАЛИТЬ<input autoFocus value={value} onChange={(event) => setValue(event.target.value)} /></label></>}
    {error && <p className="form-error">{error}</p>}
    <button className={action === 'delete' ? 'danger-button' : 'social-primary'} disabled={!valid || busy}>
      {busy ? 'Подожди…' : copy[action].button}</button>
    {needsInput && !value && <small>Заполни поле, чтобы продолжить.</small>}
  </form></div>;
}

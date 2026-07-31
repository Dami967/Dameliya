import { useState } from 'react';
import { saveProfile, uploadAvatar } from '../lib/userProfile';

type ProfileSetupStepProps = {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  onChange: (changes: { displayName?: string; username?: string; avatarUrl?: string }) => void;
  onContinue: () => void;
};

export function ProfileSetupStep(props: ProfileSetupStepProps) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function changeAvatar(file?: File) {
    if (!file) return;
    setSaving(true);
    setMessage('Загружаем фото…');
    const result = await uploadAvatar(props.userId, file);
    setSaving(false);
    if (result.error || !result.url) return setMessage(result.error?.message ?? 'Не удалось загрузить фото.');
    props.onChange({ avatarUrl: result.url });
    setMessage('Фото загружено ✓');
  }

  async function continueToInterview() {
    const displayName = props.displayName.trim();
    const username = props.username.trim().replace(/^@/, '');
    if (!displayName) return setMessage('Напиши своё имя.');
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return setMessage('Username: 3–24 латинских символа, цифры или _.');
    setSaving(true);
    const { error } = await saveProfile(props.userId, {
      display_name: displayName,
      username,
      avatar_url: props.avatarUrl,
    });
    setSaving(false);
    if (error) return setMessage(error.message.includes('unique') ? 'Этот username уже занят.' : error.message);
    props.onContinue();
  }

  return (
    <>
      <div className="onboarding-progress">{[0, 1, 2, 3].map((item) => <i key={item} className={item === 0 ? 'active' : ''} />)}</div>
      <span className="step-count">ПРОФИЛЬ</span>
      <h2>Создай свой профиль</h2>
      <p>Так Кью и будущий AI-наставник смогут обращаться к тебе лично.</p>
      <div className="profile-setup-avatar">
        <div>{props.avatarUrl ? <img src={props.avatarUrl} alt="Фото профиля" /> : props.displayName.trim()[0]?.toUpperCase() || 'G'}</div>
        <label className="secondary-button">Добавить фото<input type="file" accept="image/*" hidden onChange={(event) => changeAvatar(event.target.files?.[0])} /></label>
        <small>Фото можно добавить позже</small>
      </div>
      <div className="interview-fields profile-setup-fields">
        <label>Как тебя зовут?<input value={props.displayName} onChange={(event) => props.onChange({ displayName: event.target.value })} placeholder="Алиса" /></label>
        <label>Придумай username<input value={props.username} onChange={(event) => props.onChange({ username: event.target.value })} placeholder="alisa" /></label>
      </div>
      {message && <p className="form-error">{message}</p>}
      <div className="onboarding-actions">
        <button className="continue-button" disabled={saving} onClick={continueToInterview}>{saving ? 'Сохраняем…' : 'Перейти к интервью →'}</button>
      </div>
    </>
  );
}

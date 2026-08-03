import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { AppShell } from '../components/AppShell';
import { useSession } from '../lib/useSession';
import { loadProfile, saveProfile, uploadAvatar, type UserProfile } from '../lib/userProfile';

export function ProfileEditPage() {
  const { session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (session) void loadProfile(session.user.id).then(({ data }) => setProfile(data));
  }, [session]);

  async function save(changes: Partial<UserProfile>) {
    if (!session || !profile) return;
    const next = { ...profile, ...changes };
    setProfile(next);
    setStatus('Сохраняем…');
    const { error } = await saveProfile(session.user.id, changes);
    setStatus(error ? error.message : 'Сохранено ✓');
  }

  async function changeAvatar(file?: File) {
    if (!file || !session) return;
    if (!file.type.startsWith('image/')) { setStatus('Выбери фотографию в формате JPG, PNG или WEBP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setStatus('Фото слишком большое. Максимальный размер — 5 МБ.'); return; }
    setStatus('Загружаем фото…');
    const result = await uploadAvatar(session.user.id, file);
    result.error ? setStatus('Не удалось загрузить фото. Попробуй ещё раз.') : void save({ avatar_url: result.url });
  }

  if (!profile) return <main className="center-loader">Загружаем данные…</main>;
  return (
    <AppShell>
      <header className="page-header"><div><span className="eyebrow">ПРОФИЛЬ</span><h1>Редактирование</h1>
        <p>Изменения сохраняются автоматически.</p></div><Link href="/profile" className="secondary-button">Готово</Link></header>
      <div className="edit-layout">
        <section className="settings-card avatar-editor">
          <div className="profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" />
            : <img src="/goalquest-eagle.png" alt="Орлёнок Кью" />}</div>
          <label className="secondary-button">Изменить фото<input type="file" accept="image/*" hidden onChange={(e) => changeAvatar(e.target.files?.[0])} /></label>
          {profile.avatar_url && <button className="restore-eagle-button" onClick={() => void save({ avatar_url: null })}>
            Вернуть орлёнка</button>}
          <small>{status}</small>
        </section>
        <section className="settings-card edit-fields">
          <h2>Основная информация</h2>
          <Field label="Имя" value={profile.display_name} onSave={(value) => save({ display_name: value })} />
          <Field label="Username" value={profile.username ?? ''} prefix="@" onSave={(value) => save({ username: value.replace(/^@/, '') })} />
          <Field label="Bio" value={profile.bio} multiline onSave={(value) => save({ bio: value })} />
          <div className="field-pair">
            <Field label="Возраст" value={profile.age?.toString() ?? ''} type="number" onSave={(value) => save({ age: Number(value) || null })} />
            <Field label="Страна" value={profile.country} onSave={(value) => save({ country: value })} />
          </div>
          <Field label="Класс / университет / работа" value={profile.occupation} onSave={(value) => save({ occupation: value })} />
          <Field label="Интересы (через запятую)" value={profile.interests.join(', ')} onSave={(value) => save({ interests: split(value) })} />
          <Field label="Главные цели (через запятую)" value={profile.main_goals.join(', ')} onSave={(value) => save({ main_goals: split(value) })} />
          <Field label="Ежедневная цель" value={profile.daily_goal} onSave={(value) => save({ daily_goal: value })} />
          <Field label="Минут в день" value={profile.daily_minutes.toString()} type="number" onSave={(value) => save({ daily_minutes: Number(value) || 30 })} />
        </section>
      </div>
    </AppShell>
  );
}

type FieldProps = { label: string; value: string; prefix?: string; multiline?: boolean; type?: string; onSave: (value: string) => void };
function Field({ label, value, prefix, multiline, type = 'text', onSave }: FieldProps) {
  const [draft, setDraft] = useState(value);
  const input = multiline
    ? <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => onSave(draft)} />
    : <input type={type} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => onSave(draft)} />;
  return <label className="edit-field">{label}<span>{prefix}{input}</span></label>;
}
function split(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean); }

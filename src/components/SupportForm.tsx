import { FormEvent, useState } from 'react';
import { Link } from 'wouter';
import { AppShell } from './AppShell';
import { Icon } from './Icon';
import { sendSupportRequest, type SupportMode } from '../lib/supportRequests';
import { useSession } from '../lib/useSession';


const content = {
  support: {
    eyebrow: 'МЫ РЯДОМ',
    title: 'Связаться с поддержкой',
    intro: 'Расскажи, с чем нужна помощь. Чем подробнее описание, тем быстрее получится разобраться.',
    icon: '💬',
  },
  bug: {
    eyebrow: 'ПОМОГИ УЛУЧШИТЬ GOALQUEST',
    title: 'Сообщить об ошибке',
    intro: 'Опиши, что произошло, что ты делал перед ошибкой и какой результат ожидал.',
    icon: '🛠️',
  },
  rate: {
    eyebrow: 'ТВОЁ МНЕНИЕ ВАЖНО',
    title: 'Оценить приложение',
    intro: 'Поделись впечатлением. Твой отзыв помогает понять, что уже удобно, а что стоит улучшить.',
    icon: '✨',
  },
} as const;

export function SupportForm({ mode }: { mode: SupportMode }) {
  const { session } = useSession();
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const page = content[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || busy) return;
    const form = new FormData(event.currentTarget); setBusy(true); setError('');
    const result = await sendSupportRequest(session.user.id, {
      mode, subject: String(form.get('subject') ?? ''), details: String(form.get('details') ?? ''),
      location: String(form.get('location') ?? ''), rating: mode === 'rate' ? rating : null,
    });
    setBusy(false);
    if (result.error) return setError(result.saved
      ? 'Обращение сохранено, но Telegram пока не подключён. Попробуй позже.'
      : 'Не удалось отправить обращение. Попробуй ещё раз.');
    setSent(true);
  }

  return (
    <AppShell>
      <div className="support-shell">
        <Link href="/settings" className="document-back"><Icon name="arrow" size={15} /> Назад к настройкам</Link>
        <section className="support-card">
          <div className="support-card__intro"><span>{page.icon}</span><div><span className="eyebrow">{page.eyebrow}</span>
            <h1>{page.title}</h1><p>{page.intro}</p></div></div>
          {sent ? <Success mode={mode} /> : <form onSubmit={submit}>
            {mode === 'rate' && <div className="rating-picker" aria-label="Оценка">
              {[1, 2, 3, 4, 5].map((star) => <button type="button" key={star}
                className={star <= rating ? 'is-active' : ''} onClick={() => setRating(star)} aria-label={`${star} из 5`}>★</button>)}
              <small>{rating ? `${rating} из 5` : 'Выбери оценку'}</small>
            </div>}
            <label className="support-field"><span>{mode === 'bug' ? 'Что произошло?' : 'Тема'}</span>
              <input name="subject" required minLength={2} maxLength={120}
                placeholder={mode === 'bug' ? 'Например: не открывается награда' : 'Коротко о вопросе'} /></label>
            <label className="support-field"><span>{mode === 'rate' ? 'Твой отзыв' : 'Подробности'}</span>
              <textarea name="details" required minLength={2} maxLength={4000} rows={6} placeholder={mode === 'bug'
                ? 'Опиши шаги, после которых появилась ошибка…'
                : 'Напиши всё, что поможет нам понять ситуацию…'} /></label>
            {mode === 'bug' && <label className="support-field"><span>Где появилась ошибка?</span>
              <select name="location" defaultValue=""><option value="" disabled>Выбери раздел</option><option>Главная</option>
                <option>Мой квест</option><option>Награды</option><option>Профиль</option><option>Настройки</option></select></label>}
            <p className="support-note"><Icon name="shield" size={15} />Не указывай пароль, платёжные данные или документы.</p>
            {error && <p className="support-error">{error}</p>}
            <button className="primary-button" disabled={busy || mode === 'rate' && rating === 0}>
              {busy ? 'Отправляем…' : mode === 'rate' ? 'Отправить отзыв' : 'Отправить сообщение'} <Icon name="arrow" size={16} /></button>
          </form>}
        </section>
        <aside className="support-help"><div><span>⏱️</span><b>Когда ждать ответ?</b><p>Обычно мы отвечаем в течение 1–2 рабочих дней.</p></div>
          <div><span>🔒</span><b>Это безопасно?</b><p>Обращение используется только для ответа и улучшения GoalQuest.</p></div></aside>
      </div>
    </AppShell>
  );
}

function Success({ mode }: { mode: SupportMode }) {
  return <div className="support-success"><span>✓</span><h2>Спасибо!</h2>
    <p>{mode === 'rate' ? 'Твоя оценка сохранена и отправлена владельцу GoalQuest.'
      : 'Сообщение отправлено владельцу GoalQuest в Telegram. Ответ придёт на почту аккаунта.'}</p>
    <Link href="/settings" className="secondary-button">Вернуться в настройки</Link></div>;
}

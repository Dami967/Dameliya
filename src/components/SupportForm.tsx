import { FormEvent, useState } from 'react';
import { Link } from 'wouter';
import { AppShell } from './AppShell';
import { Icon } from './Icon';

export type SupportMode = 'support' | 'bug' | 'rate';

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
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);
  const page = content[mode];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
              <input required placeholder={mode === 'bug' ? 'Например: не открывается награда' : 'Коротко о вопросе'} /></label>
            <label className="support-field"><span>{mode === 'rate' ? 'Твой отзыв' : 'Подробности'}</span>
              <textarea required rows={6} placeholder={mode === 'bug'
                ? 'Опиши шаги, после которых появилась ошибка…'
                : 'Напиши всё, что поможет нам понять ситуацию…'} /></label>
            {mode === 'bug' && <label className="support-field"><span>Где появилась ошибка?</span>
              <select defaultValue=""><option value="" disabled>Выбери раздел</option><option>Главная</option>
                <option>Мой квест</option><option>Награды</option><option>Профиль</option><option>Настройки</option></select></label>}
            <p className="support-note"><Icon name="shield" size={15} />Не указывай пароль, платёжные данные или документы.</p>
            <button className="primary-button" disabled={mode === 'rate' && rating === 0}>
              {mode === 'rate' ? 'Отправить отзыв' : 'Отправить сообщение'} <Icon name="arrow" size={16} /></button>
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
    <p>{mode === 'rate' ? 'Твоя оценка сохранена. Спасибо, что помогаешь развивать GoalQuest.'
      : 'Сообщение подготовлено. Команда поддержки рассмотрит его и ответит на почту аккаунта.'}</p>
    <Link href="/settings" className="secondary-button">Вернуться в настройки</Link></div>;
}

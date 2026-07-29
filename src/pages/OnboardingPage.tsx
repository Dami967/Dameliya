import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Icon } from '../components/Icon';
import { useSession } from '../lib/useSession';
import { loadProfile, saveProfile } from '../lib/userProfile';

type Answers = Record<string, string>;
const steps = [
  { title: 'Давай познакомимся', text: 'Это поможет создать твой личный AI-профиль.',
    fields: [['display_name', 'Как тебя зовут?', 'Дамелия'], ['username', 'Придумай username', 'dameliya']] },
  { title: 'Расскажи о себе', text: 'Мы подберём задания, которые подходят именно тебе.',
    fields: [['age', 'Сколько тебе лет?', '15'], ['country', 'В какой стране ты живёшь?', 'Казахстан'], ['occupation', 'Где учишься или работаешь?', '9 класс']] },
  { title: 'В чём твоя суперсила?', text: 'Здесь нет правильных ответов — пиши как чувствуешь.',
    fields: [['interests', 'Твои интересы', 'Дизайн, технологии, музыка'], ['strengths', 'Сильные стороны', 'Креативность, любознательность'], ['challenges', 'Что пока даётся сложно?', 'Планирование']] },
  { title: 'Выбери главную цель', text: 'Она станет твоим первым персональным квестом.',
    fields: [['goal', 'Чего хочешь достичь?', 'Запустить первый стартап'], ['why', 'Почему это важно?', 'Хочу создать полезный продукт'], ['daily_minutes', 'Минут в день', '30']] },
] as const;

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const { session, loading } = useSession();
  const [, navigate] = useLocation();
  const current = steps[step];

  useEffect(() => {
    if (!session) return;
    void loadProfile(session.user.id).then(({ data }) => {
      if (!data) return;
      setAnswers({
        display_name: data.display_name, username: data.username ?? '', age: data.age?.toString() ?? '',
        country: data.country, occupation: data.occupation, interests: data.interests.join(', '),
        strengths: data.strengths, challenges: data.challenges, goal: data.main_goals[0] ?? '',
        daily_minutes: data.daily_minutes.toString(),
      });
    });
  }, [session]);

  async function finish() {
    if (!session) return navigate('/auth?mode=signup');
    setSaving(true);
    const { error } = await saveProfile(session.user.id, {
      display_name: answers.display_name?.trim() || 'Искатель целей',
      username: answers.username?.trim().replace(/^@/, '') || null,
      age: answers.age ? Number(answers.age) : null,
      country: answers.country?.trim() ?? '',
      occupation: answers.occupation?.trim() ?? '',
      interests: splitList(answers.interests),
      strengths: answers.strengths?.trim() ?? '',
      challenges: answers.challenges?.trim() ?? '',
      main_goals: answers.goal ? [answers.goal.trim()] : [],
      daily_goal: answers.why?.trim() ?? '',
      daily_minutes: Number(answers.daily_minutes) || 30,
      onboarding_completed: true,
    });
    setSaving(false);
    if (error) return setMessage(error.message.includes('unique') ? 'Этот username уже занят.' : error.message);
    navigate('/');
  }

  if (loading) return <main className="center-loader">Создаём твой путь…</main>;

  return (
    <main className="onboarding">
      <div className="onboarding__visual">
        <div className="brand brand--light"><span className="brand__mark"><Icon name="star" size={20} /></span><span>GoalQuest</span></div>
        <div className="onboarding-orbit"><img src="/goalquest-eagle-quest.png" alt="Орлёнок GoalQuest" /></div>
        <div><span className="eyebrow">AI-ПРОФИЛЬ</span><h1>Большая цель.<br />Маленькие шаги.<br /><em>Твой личный путь.</em></h1></div>
      </div>
      <div className="onboarding__form">
        <div className="onboarding-progress">{steps.map((_, index) => <i key={index} className={index <= step ? 'active' : ''} />)}</div>
        <span className="step-count">Шаг {step + 1} из {steps.length}</span>
        <h2>{current.title}</h2><p>{current.text}</p>
        <div className="interview-fields">
          {current.fields.map(([key, label, placeholder]) => (
            <label key={key}>{label}<input name={key} placeholder={placeholder} value={answers[key] ?? ''}
              type={key === 'age' || key === 'daily_minutes' ? 'number' : 'text'}
              onChange={(event) => setAnswers({ ...answers, [key]: event.target.value })} /></label>
          ))}
        </div>
        {message && <p className="form-error">{message}</p>}
        <div className="onboarding-actions">
          {step > 0 && <button className="back-button" onClick={() => setStep(step - 1)}>Назад</button>}
          <button className="continue-button" disabled={saving} onClick={() => step === steps.length - 1 ? finish() : setStep(step + 1)}>
            {saving ? 'Сохраняем…' : step === steps.length - 1 ? 'Создать мой квест' : 'Продолжить'} <Icon name="arrow" size={18} />
          </button>
        </div>
        <small className="privacy-note">🔒 Ответы видны только тебе и твоему AI-наставнику</small>
      </div>
    </main>
  );
}

function splitList(value = '') {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

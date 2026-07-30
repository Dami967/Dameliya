import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Icon } from '../components/Icon';
import { useSession } from '../lib/useSession';
import { loadProfile, loadSettings, saveProfile, saveSettings } from '../lib/userProfile';
import { appLanguages, detectLanguage, rememberLanguage } from '../lib/languages';
import { interviewCopy } from '../lib/onboardingLocale';
import { ProfileSetupStep } from '../components/ProfileSetupStep';

type Answers = Record<string, string>;
const steps = [
  ['age', 'country', 'occupation'],
  ['interests', 'strengths', 'challenges'],
  ['goal', 'why', 'daily_minutes'],
] as const;
const fieldOffsets = [2, 5, 8];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState(detectLanguage);
  const [profileCreated, setProfileCreated] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const { session, loading } = useSession();
  const [, navigate] = useLocation();
  const copy = interviewCopy(language);

  useEffect(() => {
    if (!session) return;
    void Promise.all([loadProfile(session.user.id), loadSettings(session.user.id)]).then(([{ data }, { data: settings }]) => {
      if (!data) return;
      const preferredLanguage = session.user.user_metadata.language as string | undefined;
      const nextLanguage = preferredLanguage || settings?.language || language;
      setLanguage(nextLanguage);
      rememberLanguage(nextLanguage);
      setAnswers({
        display_name: data.display_name, username: data.username ?? '', age: data.age?.toString() ?? '',
        country: data.country, occupation: data.occupation, interests: data.interests.join(', '),
        strengths: data.strengths, challenges: data.challenges, goal: data.main_goals[0] ?? '',
        why: data.daily_goal, daily_minutes: data.daily_minutes.toString(),
      });
      setAvatarUrl(data.avatar_url);
    }).finally(() => setProfileLoading(false));
  }, [session]);

  async function finish() {
    if (!session) return navigate('/auth?mode=signup');
    setSaving(true);
    await saveSettings(session.user.id, { language });
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
    navigate('/home');
  }

  if (loading || profileLoading) return <main className="center-loader">Создаём твой путь…</main>;

  return (
    <main className="onboarding">
      <div className="onboarding__visual">
        <div className="brand brand--light"><span className="brand__mark"><Icon name="star" size={20} /></span><span>GoalQuest</span></div>
        <div className="onboarding-orbit"><img src="/goalquest-eagle-quest.png" alt="Орлёнок GoalQuest" /></div>
        <div><span className="eyebrow">AI-ПРОФИЛЬ</span><h1>Большая цель.<br />Маленькие шаги.<br /><em>Твой личный путь.</em></h1></div>
      </div>
      <div className="onboarding__form">
        {!profileCreated && session
          ? <ProfileSetupStep userId={session.user.id} displayName={answers.display_name ?? ''} username={answers.username ?? ''}
              avatarUrl={avatarUrl} onChange={(changes) => {
                if (changes.avatarUrl) setAvatarUrl(changes.avatarUrl);
                setAnswers((current) => ({ ...current,
                  ...(changes.displayName !== undefined ? { display_name: changes.displayName } : {}),
                  ...(changes.username !== undefined ? { username: changes.username } : {}),
                }));
              }} onContinue={() => setProfileCreated(true)} />
          : <>
        <div className="onboarding-progress">{[0, 1, 2, 3].map((item) => <i key={item} className={item <= step + 1 ? 'active' : ''} />)}</div>
        <select className="interview-language" value={language} onChange={(event) => {
          setLanguage(event.target.value); rememberLanguage(event.target.value);
        }}>{appLanguages.map((item) => <option value={item.code} key={item.code}>{item.nativeName}</option>)}</select>
        <span className="step-count">{copy.step} {step + 1} / {steps.length}</span>
        <h2>{copy.titles[step + 1]}</h2><p>{copy.texts[step + 1]}</p>
        <div className="interview-fields">
          {steps[step].map((key, index) => (
            <label key={key}>{copy.labels[fieldOffsets[step] + index]}<input name={key}
              placeholder={copy.placeholders[fieldOffsets[step] + index]} value={answers[key] ?? ''}
              type={key === 'age' || key === 'daily_minutes' ? 'number' : 'text'}
              onChange={(event) => setAnswers({ ...answers, [key]: event.target.value })} /></label>
          ))}
        </div>
        {message && <p className="form-error">{message}</p>}
        <div className="onboarding-actions">
          {step > 0 && <button className="back-button" onClick={() => setStep(step - 1)}>{copy.back}</button>}
          <button className="continue-button" disabled={saving} onClick={() => step === steps.length - 1 ? finish() : setStep(step + 1)}>
            {saving ? copy.saving : step === steps.length - 1 ? copy.finish : copy.next} <Icon name="arrow" size={18} />
          </button>
        </div>
        <small className="privacy-note">{copy.privacy}</small>
        </>}
      </div>
    </main>
  );
}

function splitList(value = '') {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

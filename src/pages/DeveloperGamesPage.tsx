import { useState } from 'react';
import { Link } from 'wouter';
import { ReviewGame } from '../components/ReviewGame';
import { RewardStop } from '../components/RewardStop';
import { useSession } from '../lib/useSession';
import { useSettings } from '../lib/useSettings';
import { useDeveloperReview } from '../lib/useDeveloperReview';
import '../styles/developer-games.css';

type Mode = 'quiz' | 'cards' | 'chest';

export function DeveloperGamesPage() {
  const { session, loading: sessionLoading } = useSession();
  useSettings(session?.user.id);
  const initialMode = new URLSearchParams(window.location.search).get('mode');
  const [mode, setMode] = useState<Mode>(initialMode === 'cards' || initialMode === 'chest' ? initialMode : 'quiz');
  const [score, setScore] = useState<number | null>(null);
  const [prize, setPrize] = useState('');
  const [attempt, setAttempt] = useState(0);

  const [loadAttempt, setLoadAttempt] = useState(0);
  const { questions, title, error, loading } = useDeveloperReview(session?.user.id, loadAttempt);

  function reset() {
    setScore(null); setPrize(''); setAttempt((current) => current + 1);
  }

  return <main className="developer-games">
    <Link href="/quest">← К карте</Link>
    <header><span className="eyebrow">ПРЕДПРОСМОТР РАЗРАБОТЧИКА</span>
      <h1>Проверка игр и сундука</h1>
      <p>{title || 'Вопросы по выбранной цели и текущему этапу — без прохождения карты.'}</p>
      <small>Результат остаётся в этом предпросмотре. Прогресс и настоящие награды не меняются.</small>
    </header>
    <nav className="developer-games__tabs" aria-label="Что проверить">
      {(['quiz', 'cards', 'chest'] as const).map((item, index) => <button key={item}
        aria-pressed={mode === item} onClick={() => { setMode(item); setScore(null); }}>
        {['Викторина', 'Карточки', 'Обычный сундук'][index]}</button>)}
    </nav>
    {mode !== 'chest' && !session && !sessionLoading && <p><Link href="/auth">Войди в аккаунт</Link>, чтобы открыть свою текущую цель.</p>}
    {error && mode !== 'chest' && <p role="alert">{error} <button onClick={() => setLoadAttempt((current) => current + 1)}>Повторить</button></p>}
    {mode === 'chest' ? <section className="content-card"><h2>Обычный сундук</h2>
      <p>Нажми на сундук, чтобы увидеть его открытие и состояние «Получен».</p>
      <RewardStop title="Обычный сундук" unlocked chapterIndex={0} preview prize={prize} onOpened={setPrize} />
      {prize && <p role="status">{prize}</p>}
    </section> : loading || sessionLoading ? <p role="status">Готовим вопросы по твоей цели…</p> : !questions.length ? null : score === null ? <ReviewGame key={`${mode}-${attempt}`} initialMode={mode}
      questions={questions} busy={false} submitLabel="Проверить результат"
      onFinish={(answers) => setScore(answers.reduce((total, answer, index) =>
        total + (answer === questions[index].correct ? 1 : 0), 0))} />
      : <section className="content-card" role="status"><h2>Тестовый результат: {score} из {questions.length}</h2>
        <p>Проверка завершена. Настоящий прогресс не изменён.</p></section>}
    <button className="secondary-button developer-games__reset" onClick={reset}>Начать проверку заново</button>
  </main>;
}

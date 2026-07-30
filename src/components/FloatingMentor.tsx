import { FormEvent, useEffect, useState } from 'react';
import { detectLanguage, languageName } from '../lib/languages';
import { supabase } from '../lib/supabase';
import { loadSettings } from '../lib/userProfile';
import { useSession } from '../lib/useSession';
import { Icon } from './Icon';

export function FloatingMentor() {
  const { session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(detectLanguage);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    void loadSettings(session.user.id).then(({ data }) => {
      if (data?.language) setLanguage(data.language);
    });
  }, [session]);

  async function ask(text: string) {
    if (!text.trim() || busy) return;
    setQuestion(text.trim());
    setBusy(true);
    setAnswer('');
    const selectedLanguage = languageName(language);
    const { data, error } = await supabase.functions.invoke('ai', {
      body: {
        prompt: text.trim(),
        system: `You are Q, a kind GoalQuest mentor for self-development. Always answer in ${selectedLanguage}.
Keep the answer short, practical and age-appropriate. Help the user take a real next step.
Never add combat or gambling mechanics. Do not claim professional medical, legal or financial expertise.`,
      },
    });
    setAnswer(error ? fallback(language) : typeof data?.text === 'string' ? data.text : fallback(language));
    setBusy(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('mentor') as HTMLInputElement;
    void ask(input.value);
    input.value = '';
  }

  return (
    <div className={`floating-mentor ${isOpen ? 'is-open' : ''}`}>
      {isOpen && <section className="mentor-popover">
        <header><img src="/goalquest-eagle-quest.png" alt="" /><div><b>Q · AI Mentor</b>
          <small><i /> {languageName(language)}</small></div>
          <button onClick={() => setIsOpen(false)} aria-label="Закрыть">×</button></header>
        <div className="mentor-popover__chat">
          <p>{welcome(language)}</p>
          {question && <p className="mentor-popover__answer">{question}</p>}
          {busy && <p>•••</p>}
          {answer && <p>{answer}</p>}
        </div>
        <div className="mentor-suggestions">
          <button onClick={() => void ask('I feel stuck. Help me choose one small next step.')}>🧩 Small step</button>
          <button onClick={() => void ask('Help me plan my goal for today.')}>🎯 Today’s plan</button>
        </div>
        <form onSubmit={submit}><input name="mentor" placeholder="Ask Q…" />
          <button aria-label="Отправить" disabled={busy}>↑</button></form>
        <small className="mentor-cost"><Icon name="zap" size={13} /> AI answers in {languageName(language)}</small>
      </section>}
      {!isOpen && <span className="mentor-hint">AI Mentor</span>}
      <button className="mentor-fab" onClick={() => setIsOpen(!isOpen)} aria-label="Открыть AI Mentor">
        <b className="mentor-fab__letter">Q</b>
        <span className="mentor-fab__status"><Icon name={isOpen ? 'plus' : 'message'} size={16} /></span>
      </button>
    </div>
  );
}

function welcome(language: string) {
  if (language === 'ru') return 'Привет! Расскажи, над какой целью ты работаешь 🦅';
  if (language === 'kk') return 'Сәлем! Қандай мақсатпен жұмыс істеп жатқаныңды айт 🦅';
  return 'Hi! Tell me which goal you are working on 🦅';
}

function fallback(language: string) {
  if (language === 'ru') return 'Сейчас не получилось получить ответ. Попробуй ещё раз.';
  if (language === 'kk') return 'Қазір жауап алу мүмкін болмады. Қайтадан байқап көр.';
  return 'I could not get an answer right now. Please try again.';
}

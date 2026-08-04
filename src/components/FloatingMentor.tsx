import { useEffect, useState } from 'react';
import { detectLanguage, languageName } from '../lib/languages';
import { askAi } from '../lib/ai';
import type { AiAttachment } from '../lib/aiAttachments';
import { loadSettings } from '../lib/userProfile';
import { useSession } from '../lib/useSession';
import { Icon } from './Icon';
import { AiComposer } from './AiComposer';
import { loadActiveQuest } from '../lib/activeQuest';
import { compactMentorReply, conciseMentorRules } from '../lib/mentorStyle';
import { loadInterviewContext } from '../lib/interviewContext';

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
  useEffect(() => {
    const changed = (event: Event) => {
      setLanguage((event as CustomEvent<string>).detail || detectLanguage());
    };
    window.addEventListener('goalquest-language-changed', changed);
    return () => window.removeEventListener('goalquest-language-changed', changed);
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  async function ask(text: string, attachments: AiAttachment[] = []) {
    if (!text.trim() || busy) return;
    setQuestion(text.trim());
    setBusy(true);
    setAnswer('');
    const selectedLanguage = languageName(language);
    const [planResult, interview] = session
      ? await Promise.all([loadActiveQuest(session.user.id,
        new URLSearchParams(window.location.search).get('plan')), loadInterviewContext(session.user.id)])
      : [{ data: null }, 'Interview data is unavailable.'] as const;
    const plan = planResult.data;
    const context = plan ? `PRIMARY AND CURRENT MAP: ${plan.map_title}. CURRENT GOAL: ${plan.goal}.
Current step: ${plan.steps.find((step) => step.state === 'active')?.title || 'not selected'}.
Focus only on this map. Do not replace it with another user goal unless the user explicitly asks to switch.\n` : '';
    const result = await askAi(`${interview}\n${context}${text.trim()}`, `You are Q, a kind GoalQuest mentor for self-development. Always answer in ${selectedLanguage}.
${conciseMentorRules}
Never add combat or gambling mechanics. Do not claim professional medical, legal or financial expertise.
The current map in the prompt always has priority over interests and other goals from the interview.
Understand attached images, documents and voice messages when present.`, attachments, true);
    setAnswer(compactMentorReply(result.text ?? fallback(language)));
    setBusy(false);
  }

  return (
    <div className={`floating-mentor ${isOpen ? 'is-open' : ''}`}>
      {isOpen && <section className="mentor-popover">
        <header><img src="/goalquest-eagle-quest.png" alt="" /><div><b>Q · AI Mentor</b>
          <small><i /> {languageName(language)}</small></div>
          <button className="mentor-header-close" onClick={() => setIsOpen(false)} aria-label="Выйти из Q">
            <span>Выйти</span> ×
          </button></header>
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
        <AiComposer busy={busy} name="mentor" placeholder="Ask Q…" onSend={(text, files) => void ask(text, files)} />
        <small className="mentor-cost"><Icon name="zap" size={13} /> AI answers in {languageName(language)}</small>
        <button className="mentor-mobile-close" type="button" onClick={() => setIsOpen(false)}>
          <span>×</span> Выйти из Q
        </button>
      </section>}
      {!isOpen && <span className="mentor-hint">AI Mentor</span>}
      <button className="mentor-fab" onClick={() => setIsOpen((value) => !value)} aria-label="Открыть AI Mentor">
        <span className="mentor-fab__letter">Q</span>
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

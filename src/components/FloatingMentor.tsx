import { useEffect, useRef, useState } from 'react';
import { detectLanguage, languageName } from '../lib/languages';
import { askAi } from '../lib/ai';
import type { AiAttachment } from '../lib/aiAttachments';
import { loadSettings } from '../lib/userProfile';
import { useSession } from '../lib/useSession';
import { Icon } from './Icon';
import { AiComposer } from './AiComposer';
import { loadAiQuest } from '../lib/aiQuest';
import { compactMentorReply, conciseMentorRules } from '../lib/mentorStyle';
import { loadInterviewContext } from '../lib/interviewContext';

export function FloatingMentor() {
  const { session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(detectLanguage);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try { return JSON.parse(localStorage.getItem('goalquest_q_position') || 'null'); } catch { return null; }
  });
  const drag = useRef<{ startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (!session) return;
    void loadSettings(session.user.id).then(({ data }) => {
      if (data?.language) setLanguage(data.language);
    });
  }, [session]);
  useEffect(() => {
    if (position) localStorage.setItem('goalquest_q_position', JSON.stringify(position));
  }, [position]);
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
      ? await Promise.all([loadAiQuest(session.user.id), loadInterviewContext(session.user.id)])
      : [{ data: null }, 'Interview data is unavailable.'] as const;
    const plan = planResult.data;
    const context = plan ? `Current goal: ${plan.goal}. Current step: ${plan.steps.find((step) => step.state === 'active')?.title || 'not selected'}.\n` : '';
    const result = await askAi(`${interview}\n${context}${text.trim()}`, `You are Q, a kind GoalQuest mentor for self-development. Always answer in ${selectedLanguage}.
${conciseMentorRules}
Never add combat or gambling mechanics. Do not claim professional medical, legal or financial expertise.
Understand attached images, documents and voice messages when present.`, attachments, true);
    setAnswer(compactMentorReply(result.text ?? fallback(language)));
    setBusy(false);
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    drag.current = { startX: event.clientX, startY: event.clientY, x: rect?.left ?? 0, y: rect?.top ?? 0, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.startX;
    const dy = event.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.current.moved = true;
    if (!drag.current.moved) return;
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - 76, drag.current.x + dx)),
      y: Math.max(8, Math.min(window.innerHeight - 76, drag.current.y + dy)),
    });
  }
  function stopDrag() {
    const wasMoved = drag.current?.moved;
    drag.current = null;
    if (!wasMoved) setIsOpen((value) => !value);
  }

  return (
    <div className={`floating-mentor ${isOpen ? 'is-open' : ''} ${position && position.y < 400 ? 'mentor-opens-down' : ''} ${position && position.x < 320 ? 'mentor-align-left' : ''}`}
      style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}>
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
        <AiComposer busy={busy} name="mentor" placeholder="Ask Q…" onSend={(text, files) => void ask(text, files)} />
        <small className="mentor-cost"><Icon name="zap" size={13} /> AI answers in {languageName(language)}</small>
      </section>}
      {!isOpen && <span className="mentor-hint">AI Mentor</span>}
      <button className="mentor-fab" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag}
        onPointerCancel={() => { drag.current = null; }}
        aria-label="Открыть или перетащить AI Mentor">
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

import { useEffect, useState } from 'react';
import { askAi } from '../lib/ai';
import type { AiAttachment } from '../lib/aiAttachments';
import type { TaskChatMessage } from '../lib/taskRecords';
import { AiComposer } from './AiComposer';
import { Icon } from './Icon';
import { compactMentorReply, conciseMentorRules } from '../lib/mentorStyle';

export function TaskMentor({ task, notes, learningContext = '', initialMessages = [], onMessages }: {
  task: string; notes: string; learningContext?: string; initialMessages?: TaskChatMessage[];
  onMessages?: (messages: TaskChatMessage[]) => void;
}) {
  const [messages, setMessages] = useState<TaskChatMessage[]>(initialMessages.length ? initialMessages : [
    { role: 'q', text: 'Привет! Я помогу разобраться с заданием. Если застрянешь — напиши ✨' },
  ]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (initialMessages.length) setMessages(initialMessages);
  }, [initialMessages]);

  async function ask(question: string, attachments: AiAttachment[] = []) {
    if (!question.trim() || busy) return;
    const conversation = messages.slice(-12).map((message) =>
      `${message.role === 'user' ? 'Пользователь' : 'Кью'}: ${message.text}`).join('\n');
    append({ role: 'user', text: question.trim() });
    setBusy(true);
    const result = await askAi(
      `Задание: ${task}
Заметки пользователя: ${notes || 'пока пусто'}
История заметок и разговоров из всех пройденных этапов:
${learningContext || 'пройденных этапов пока нет'}
Предыдущий разговор:
${conversation || 'разговора ещё не было'}
Новый вопрос: ${question}`,
      `Ты Кью, AI-наставник GoalQuest. Изучи приложенные фото, файлы или голосовое, если они есть.
Помоги выполнить текущее задание, но не делай всю работу вместо пользователя. ${conciseMentorRules}`,
      attachments,
      true,
    );
    append({ role: 'q', text: compactMentorReply(result.text ?? result.error.message) });
    setBusy(false);
  }

  function append(message: TaskChatMessage) {
    setMessages((current) => {
      const next = [...current, message];
      onMessages?.(next);
      return next;
    });
  }

  return <aside className="ai-panel">
    <div className="ai-panel__head"><span className="mentor-avatar">AI</span>
      <div><h3>Кью · AI-наставник</h3><small><i /> Учитывает текущее задание</small></div></div>
    <div className="ai-chat">{messages.map((message, index) =>
      <div className={message.role === 'q' ? 'ai-bubble' : 'user-bubble'} key={`${message.text}-${index}`}>{message.text}</div>)}
      {busy && <div className="ai-bubble">Кью думает…</div>}
    </div>
    <div className="quick-prompts">
      <button disabled={busy} onClick={() => void ask('Разбей это задание на маленькие шаги')}>Разбить на шаги</button>
      <button disabled={busy} onClick={() => void ask('Я застрял. Предложи другой подход')}>Я застрял</button>
    </div>
    <AiComposer busy={busy} name="chat" placeholder="Спроси наставника..." onSend={(text, files) => void ask(text, files)} />
    <div className="ai-energy"><Icon name="sparkles" size={16} /><span>Ответ создаётся персонально для тебя</span></div>
  </aside>;
}

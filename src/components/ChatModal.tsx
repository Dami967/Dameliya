import { useEffect, useState } from 'react';
import { socialUsers, type SocialUser } from '../lib/socialData';
import { loadSocialState, saveSocialState, uploadVoiceMessage, type StoredChatMessage } from '../lib/socialPersistence';
import { useSession } from '../lib/useSession';
import { Icon } from './Icon';
import { SocialAvatar } from './SocialAvatar';
import { VoiceRecorder } from './VoiceRecorder';
import { CallOverlay } from './CallOverlay';
import { VoiceMessage } from './VoiceMessage';

export function ChatModal({ user, onClose }: { user: SocialUser; onClose: () => void }) {
  const { session } = useSession();
  const [messages, setMessages] = useState<StoredChatMessage[]>([]);
  const [call, setCall] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [forwarding, setForwarding] = useState<StoredChatMessage | null>(null);
  useEffect(() => {
    if (!session) return;
    void loadSocialState<{ messages: StoredChatMessage[] }>(session.user.id, 'chat', user.id)
      .then(({ data }) => setMessages(data?.payload.messages ?? []));
  }, [session, user.id]);
  function store(next: StoredChatMessage[]) {
    setMessages(next);
    if (session) void saveSocialState(session.user.id, 'chat', user.id, { messages: next });
  }
  function addText(text: string) {
    store([...messages, { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }]);
  }
  async function addVoice(blob: Blob) {
    if (!session) return;
    setUploading(true);
    const { url } = await uploadVoiceMessage(session.user.id, blob);
    if (url) store([...messages, { id: crypto.randomUUID(), audioUrl: url, createdAt: new Date().toISOString() }]);
    setUploading(false);
  }
  function removeMessage(id: string) {
    store(messages.filter((message) => message.id !== id));
  }
  async function forwardMessage(friendId: string) {
    if (!session || !forwarding) return;
    const { data } = await loadSocialState<{ messages: StoredChatMessage[] }>(session.user.id, 'chat', friendId);
    const forwarded: StoredChatMessage = {
      ...forwarding,
      id: crypto.randomUUID(),
      text: forwarding.text ? `↪ ${forwarding.text}` : undefined,
      createdAt: new Date().toISOString(),
    };
    await saveSocialState(session.user.id, 'chat', friendId, {
      messages: [...(data?.payload.messages ?? []), forwarded],
    });
    setForwarding(null);
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="social-modal chat-modal" onMouseDown={(event) => event.stopPropagation()}>
    <header><SocialAvatar user={user} /><div><b>{user.name}</b><small>{user.online ? 'онлайн' : 'не в сети'}</small></div>
      <nav><button onClick={() => setCall(true)} aria-label="Аудиозвонок">☎</button><button onClick={onClose}>×</button></nav>
    </header>
    <div className="chat-messages"><p className="theirs">Я рядом! Давай сделаем сегодня ещё один шаг 🚀</p>{messages.map((message) =>
      <div className="message-with-actions" key={message.id}>
        {message.audioUrl ? <VoiceMessage url={message.audioUrl} /> : <p className="mine">{message.text}</p>}
        <div><button onClick={() => setForwarding(message)} title="Переслать">↗</button>
          <button onClick={() => removeMessage(message.id)} title="Удалить">⌫</button></div>
      </div>)}</div>
    <div className="quick-support"><button onClick={() => addText('Ты справишься! 💪')}>💪 Поддержать</button><button onClick={() => addText('Лови подарок! 🎁')}><Icon name="gift" size={15} /> Подарок</button><button>🎯 Челлендж</button></div>
    <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const text = new FormData(form).get('message')?.toString().trim(); if (text) addText(text); form.reset(); }}>
      <VoiceRecorder onRecorded={(blob) => void addVoice(blob)} disabled={uploading} /><input name="message" placeholder={uploading ? 'Загружаем голосовое…' : 'Сообщение…'} /><button aria-label="Отправить"><Icon name="send" size={18} /></button>
    </form>
    {call && <CallOverlay user={user} onClose={() => setCall(false)} />}
    {forwarding && <div className="forward-sheet"><header><b>Переслать сообщение</b><button onClick={() => setForwarding(null)}>×</button></header>
      <p>Выбери друга</p>{socialUsers.filter((friend) => friend.id !== user.id).map((friend) =>
        <button className="forward-person" key={friend.id} onClick={() => void forwardMessage(friend.id)}>
          <SocialAvatar user={friend} size="small" /><span><b>{friend.name}</b><small>@{friend.username}</small></span><i>→</i>
        </button>)}
    </div>}
  </section></div>;
}

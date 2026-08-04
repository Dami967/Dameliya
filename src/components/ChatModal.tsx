import { useCallback, useEffect, useState } from 'react';
import type { SocialUser } from '../lib/socialData';
import { uploadVoiceMessage } from '../lib/socialPersistence';
import { deleteDirectMessage, loadDirectMessages, sendDirectMessage,
  subscribeToMessages, type DirectMessage } from '../lib/directMessages';
import { Icon } from './Icon';
import { SocialAvatar } from './SocialAvatar';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceMessage } from './VoiceMessage';

export function ChatModal({ user, currentUserId, friends, onClose }: {
  user: SocialUser; currentUserId: string; friends: SocialUser[]; onClose: () => void;
}) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [forwarding, setForwarding] = useState<DirectMessage | null>(null);
  const refresh = useCallback(() => {
    void loadDirectMessages(currentUserId, user.id).then(({ data, error: loadError }) => {
      setMessages(data ?? []);
      setError(loadError ? 'Не удалось загрузить переписку.' : '');
      setMessagesLoading(false);
    });
  }, [currentUserId, user.id]);

  useEffect(() => {
    setMessages([]);
    setMessagesLoading(true);
    refresh();
    const channel = subscribeToMessages(currentUserId, user.id, refresh);
    return () => { void channel.unsubscribe(); };
  }, [currentUserId, refresh, user.id]);

  async function send(kind: DirectMessage['kind'], content: string) {
    if (!content.trim()) return;
    const result = await sendDirectMessage(user.id, kind, content.trim());
    if (result.error) return setError('Сообщение не отправлено. Убедись, что вы взаимные друзья.');
    setMessages((old) => old.some((item) => item.id === result.data.id) ? old : [...old, result.data]);
    setError('');
  }

  async function addVoice(blob: Blob) {
    setUploading(true);
    const { url } = await uploadVoiceMessage(currentUserId, blob);
    if (url) await send('audio', url);
    else setError('Не удалось отправить голосовое сообщение.');
    setUploading(false);
  }

  async function remove(message: DirectMessage) {
    if (message.sender_id !== currentUserId) return;
    const result = await deleteDirectMessage(message.id);
    if (!result.error) setMessages((old) => old.filter((item) => item.id !== message.id));
  }

  async function forward(friendId: string) {
    if (!forwarding) return;
    const result = await sendDirectMessage(friendId, forwarding.kind, forwarding.content);
    if (result.error) setError('Не удалось переслать сообщение.');
    setForwarding(null);
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><section className="social-modal chat-modal"
    onMouseDown={(event) => event.stopPropagation()}>
    <header><SocialAvatar user={user} /><div><b>{user.name}</b><small>{user.online ? 'онлайн' : 'не в сети'}</small></div>
      <nav><button onClick={onClose} aria-label="Закрыть">×</button></nav></header>
    <div className="chat-messages">{messages.map((message) => {
      const mine = message.sender_id === currentUserId;
      return <div className={`message-with-actions ${mine ? 'is-mine' : ''} ${message.kind === 'call' ? 'is-call' : ''}`} key={message.id}>
        {message.kind === 'call' ? <p className="call-history">{message.content}</p>
          : message.kind === 'audio' ? <VoiceMessage url={message.content} />
          : <p className={mine ? 'mine' : 'theirs'}>{message.content}</p>}
        {message.kind !== 'call' && <div><button onClick={() => setForwarding(message)} title="Переслать">↗</button>
          {mine && <button onClick={() => void remove(message)} title="Удалить">⌫</button>}</div>
        }
      </div>;
    })}{messagesLoading && <p className="chat-empty">Загружаем сообщения…</p>}
      {!messagesLoading && !messages.length && <p className="chat-empty">Начни настоящий разговор с {user.name}.</p>}</div>
    {error && <p className="form-error">{error}</p>}
    <div className="quick-support"><button onClick={() => void send('support', 'Ты справишься! 💪')}>💪 Поддержать</button>
      <button onClick={() => void send('gift', 'Лови подарок! 🎁')}><Icon name="gift" size={15} /> Подарок</button></div>
    <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget;
      const text = new FormData(form).get('message')?.toString() ?? '';
      if (text.trim()) void send('text', text); form.reset(); }}>
      <VoiceRecorder onRecorded={(blob) => void addVoice(blob)} disabled={uploading} />
      <input name="message" placeholder={uploading ? 'Загружаем голосовое…' : 'Сообщение…'} />
      <button aria-label="Отправить"><Icon name="send" size={18} /></button>
    </form>
    {forwarding && <div className="forward-sheet"><header><b>Переслать другу</b><button onClick={() => setForwarding(null)}>×</button></header>
      {friends.filter((friend) => friend.id !== user.id).map((friend) =>
        <button className="forward-person" key={friend.id} onClick={() => void forward(friend.id)}>
          <SocialAvatar user={friend} size="small" /><span><b>{friend.name}</b><small>@{friend.username}</small></span><i>→</i>
        </button>)}
    </div>}
  </section></div>;
}

import { useEffect, useRef, useState } from 'react';
import type { SocialUser } from '../lib/socialData';
import { SocialAvatar } from './SocialAvatar';

export function CallOverlay({ user, onClose }: { user: SocialUser; onClose: () => void }) {
  const stream = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState('Подключаемся…');
  useEffect(() => {
    void navigator.mediaDevices.getUserMedia({ audio: true }).then((media) => {
      stream.current = media;
      setStatus('Вызов…');
    }).catch(() => setStatus('Разреши доступ к микрофону в браузере'));
    return () => stream.current?.getTracks().forEach((track) => track.stop());
  }, []);
  return <div className="call-overlay">
    <div className="call-person"><SocialAvatar user={user} size="large" /><h2>{user.name}</h2><p>Аудиозвонок · {status}</p></div>
    <div className="call-controls"><button>🎙️</button><button className="hang-up" onClick={onClose}>☎</button></div>
  </div>;
}

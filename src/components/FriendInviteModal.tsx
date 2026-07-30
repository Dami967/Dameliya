import { useEffect, useRef, useState } from 'react';
import { createFriendInvite, friendInviteUrl, readInviteToken } from '../lib/friendInvites';

export function FriendInviteModal({ userId, onClose, onScanned }: {
  userId: string; onClose: () => void; onScanned: (token: string) => void;
}) {
  const [mode, setMode] = useState<'share' | 'scan'>('share');
  const [inviteUrl, setInviteUrl] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [message, setMessage] = useState('Создаём персональную ссылку…');

  useEffect(() => {
    void createFriendInvite(userId).then(async ({ data, error }) => {
      if (error || !data) return setMessage(error?.message ?? 'Не удалось создать приглашение.');
      const url = friendInviteUrl(data.token);
      setInviteUrl(url);
      const { default: QRCode } = await import('qrcode');
      setQrImage(await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: '#172235', light: '#ffffff' } }));
      setMessage('Ссылка действует 7 дней и добавит только одного друга.');
    });
  }, [userId]);

  async function share() {
    if (!inviteUrl) return;
    if (navigator.share) await navigator.share({ title: 'Добавь меня в GoalQuest', url: inviteUrl });
    else {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage('Ссылка скопирована ✓');
    }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="social-modal friend-invite-modal" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={onClose}>×</button>
      <span className="eyebrow">ДОБАВИТЬ ДРУГА</span><h2>Встретьтесь в GoalQuest</h2>
      <div className="invite-tabs">
        <button className={mode === 'share' ? 'is-active' : ''} onClick={() => setMode('share')}>Мой QR и ссылка</button>
        <button className={mode === 'scan' ? 'is-active' : ''} onClick={() => setMode('scan')}>Сканировать</button>
      </div>
      {mode === 'share' ? <div className="invite-share">
        {qrImage ? <img src={qrImage} alt="QR-код приглашения в друзья" /> : <div className="qr-loading">•••</div>}
        <p>Покажи этот QR-код другу или отправь ему персональную ссылку.</p>
        <div className="invite-link"><input readOnly value={inviteUrl} /><button onClick={() => void share()}>Поделиться</button></div>
      </div> : <QrScanner onFound={onScanned} />}
      <small className="invite-message">{message}</small>
    </section>
  </div>;
}

function QrScanner({ onFound }: { onFound: (token: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stopped = false;
    let stop: (() => void) | undefined;
    void import('@zxing/browser').then(async ({ BrowserQRCodeReader }) => {
      if (!videoRef.current || stopped) return;
      try {
        const controls = await new BrowserQRCodeReader().decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          const token = result && readInviteToken(result.getText());
          if (token) { controls.stop(); onFound(token); }
        });
        stop = () => controls.stop();
      } catch {
        setError('Не удалось открыть камеру. Разреши доступ к камере в настройках браузера.');
      }
    });
    return () => { stopped = true; stop?.(); };
  }, [onFound]);
  return <div className="qr-scanner"><video ref={videoRef} muted playsInline />
    <span>Наведи камеру на QR-код GoalQuest</span>{error && <p className="form-error">{error}</p>}</div>;
}

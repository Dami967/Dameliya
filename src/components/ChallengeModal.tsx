import { useState } from 'react';
import type { ChallengeDraft } from '../lib/collaborationData';
import { challengeLabels } from '../lib/collaborationData';
import { competitionInviteUrl, createCompetitionInvite } from '../lib/competitions';
import type { SocialUser } from '../lib/socialData';
import { SocialAvatar } from './SocialAvatar';
import { challengeRule, randomChallengeType } from '../lib/challengeRules';

export function ChallengeModal({ friends, onClose, onCreate, mysteryPrize = false }: {
  friends: SocialUser[]; onClose: () => void;
  onCreate: (challenge: ChallengeDraft) => Promise<string | null>; mysteryPrize?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [message, setMessage] = useState('');
  const [challengeType] = useState(randomChallengeType);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="social-modal creation-modal challenge-form" onMouseDown={(event) => event.stopPropagation()} onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const inviteMode = submitter?.value === 'share' ? 'share' : 'friends';
    const days = Number(form.get('duration')) || 7;
    const endsAt = mysteryPrize ? new Date(Date.now() + (days + 1) * 86400000).toISOString().slice(0, 10)
      : form.get('endsAt')?.toString() ?? '';
    const draft = { title: form.get('title')?.toString() || challengeLabels[challengeType],
      participantIds: inviteMode === 'share' ? [] : selected,
      type: challengeType,
      startsAt: form.get('startsAt')?.toString() ?? tomorrow, endsAt,
      reward: 'Случайный приз' } satisfies ChallengeDraft;
    setMessage('Создаём челлендж…');
    const challengeId = await onCreate(draft);
    if (!challengeId) return setMessage('Не удалось создать челлендж. Попробуй ещё раз.');
    if (inviteMode !== 'share') return onClose();
    const invite = await createCompetitionInvite(challengeId);
    if (invite.error || !invite.data) return setMessage('Не удалось создать ссылку.');
    const url = competitionInviteUrl(invite.data);
    const { default: QRCode } = await import('qrcode');
    setShareUrl(url);
    setQrImage(await QRCode.toDataURL(url, { width: 240, margin: 2,
      color: { dark: '#172235', light: '#ffffff' } }));
    setMessage('Ссылка действует 7 дней. Присоединиться смогут до 5 друзей.');
  }}>
    <button type="button" className="modal-close" onClick={onClose}>×</button>
    <header><span>🏁</span><div><h2>Дружеский челлендж</h2><p>Маленькое соревнование — большая мотивация</p></div></header>
    <div className="form-field"><span>Выбери взаимных друзей · до 5 человек</span><div className="friend-picker">{friends.map((friend) => <button type="button" key={friend.id} className={selected.includes(friend.id) ? 'is-selected' : ''} onClick={() => setSelected((old) => {
      if (old.includes(friend.id)) return old.filter((id) => id !== friend.id);
      return old.length < 5 ? [...old, friend.id] : old;
    })}><SocialAvatar user={friend} size="small" /><b>{friend.name}</b><i>✓</i></button>)}
      {!friends.length && <p className="friend-picker-empty">Взаимных друзей пока нет. Они появятся здесь, когда вы подпишетесь друг на друга.</p>}</div></div>
    <section className="random-challenge-rule"><span>🎯 СЛУЧАЙНАЯ ЦЕЛЬ ЧЕЛЛЕНДЖА</span>
      <h3>{challengeLabels[challengeType]}</h3><p>{challengeRule(challengeType)}</p></section>
    <label><span>Название</span><input name="title" maxLength={80} placeholder="Например, Рывок недели" /></label>
    {mysteryPrize ? <label><span>Сколько дней соревноваться?</span><select name="duration" defaultValue="7">
      <option value="3">3 дня · обычный приз</option><option value="7">7 дней · необычный приз</option>
      <option value="14">14 дней · редкий приз</option><option value="30">30 дней · эпический приз</option>
    </select></label> : <div className="date-fields"><label><span>Начало</span><input name="startsAt" type="date" min={tomorrow} defaultValue={tomorrow} required /></label><label><span>Окончание</span><input name="endsAt" type="date" min={tomorrow} defaultValue={nextWeek} required /></label></div>}
    {shareUrl ? <section className="challenge-share-box">
      {qrImage ? <img src={qrImage} alt="QR-код приглашения на челлендж" /> : <div className="qr-loading">•••</div>}
      <p>Покажи QR-код или отправь ссылку другу.</p><div className="invite-link"><input readOnly value={shareUrl} />
        <button type="button" onClick={() => void shareChallenge(shareUrl, setMessage)}>Поделиться</button></div>
    </section> : <div className="challenge-invite-actions">
      <button name="inviteMode" value="friends" disabled={!selected.length} className="social-primary submit-creation">
        Отправить выбранным · {selected.length}</button>
      <button name="inviteMode" value="share" className="social-outline">Создать QR-код и ссылку</button>
    </div>}
    {message && <small className="invite-message">{message}</small>}
  </form></div>;
}

async function shareChallenge(url: string, setMessage: (message: string) => void) {
  if (navigator.share) await navigator.share({ title: 'Дружеский челлендж GoalQuest', url });
  else { await navigator.clipboard.writeText(url); setMessage('Ссылка скопирована ✓'); }
}

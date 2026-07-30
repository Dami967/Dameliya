import { useState } from 'react';
import type { TeamDraft } from '../lib/collaborationData';

export function CreateTeamModal({ onClose, onCreate }: { onClose: () => void; onCreate: (team: TeamDraft) => void }) {
  const [avatarUrl, setAvatarUrl] = useState('');
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="social-modal creation-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onCreate({
      name: form.get('name')?.toString().trim() ?? '',
      description: form.get('description')?.toString().trim() ?? '',
      category: form.get('category')?.toString() ?? 'Программирование',
      visibility: form.get('visibility') as TeamDraft['visibility'],
      avatarUrl,
    });
  }}>
    <button type="button" className="modal-close" onClick={onClose}>×</button>
    <header><span>👥</span><div><h2>Новая команда</h2><p>Соберите людей вокруг общей цели</p></div></header>
    <label className="avatar-upload">{avatarUrl ? <img src={avatarUrl} alt="" /> : <span>📷</span>}<b>Аватар команды</b><small>PNG или JPG до 3 МБ</small><input type="file" accept="image/png,image/jpeg" onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) setAvatarUrl(URL.createObjectURL(file));
    }} /></label>
    <label><span>Название команды</span><input name="name" required minLength={2} maxLength={60} placeholder="Например, Код будущего" /></label>
    <label><span>Описание</span><textarea name="description" maxLength={300} placeholder="Чего вы хотите достичь вместе?" /></label>
    <label><span>Категория</span><select name="category"><option>Программирование</option><option>Стартап</option><option>Исследование</option><option>Английский язык</option><option>Олимпиады</option><option>Другое</option></select></label>
    <fieldset><legend>Кто может вступить?</legend><label><input type="radio" name="visibility" value="public" defaultChecked /><span>🌍 Публичная<small>Видна всем пользователям</small></span></label><label><input type="radio" name="visibility" value="private" /><span>🔒 Приватная<small>Только по приглашению</small></span></label></fieldset>
    <button className="social-primary submit-creation">Создать команду</button>
  </form></div>;
}

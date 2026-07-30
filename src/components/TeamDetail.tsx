import { useState } from 'react';
import type { CreatedTeam } from '../lib/collaborationData';
import { SocialAvatar } from './SocialAvatar';
import { TeamQuestPanel } from './TeamQuestPanel';
import { TeamRolesPanel } from './TeamRolesPanel';

export function TeamDetail({ team, userId, onBack, onDelete }: { team: CreatedTeam; userId: string; onBack: () => void; onDelete: () => void }) {
  const [messages, setMessages] = useState(['Добро пожаловать! Давайте выберем первую общую цель 🚀']);
  return <section className="team-detail">
    <button className="back-link" onClick={onBack}>← Все команды</button>
    <header className="team-detail-head"><div className="team-big-avatar">{team.avatarUrl ? <img src={team.avatarUrl} alt="" /> : '👥'}</div><div><span>{team.visibility === 'private' ? '🔒 Приватная' : '🌍 Публичная'} · {team.category}</span><h2>{team.name}</h2><p>{team.description || 'Вместе превращаем идеи в результат.'}</p></div><button className="social-outline">+ Пригласить</button></header>
    <div className="team-overview"><article><small>ОБЩИЙ ПРОГРЕСС</small><b>{team.progress}%</b><div className="team-progress"><span style={{ width: `${team.progress}%` }} /></div></article><article><small>УЧАСТНИКИ</small><b>{team.members.length}</b><span>1 активен сейчас</span></article><article><small>МЕСТО В РЕЙТИНГЕ</small><b>#12</b><span>↑ 3 за неделю</span></article></div>
    <div className="team-detail-grid">
      <div><TeamQuestPanel teamId={team.id} userId={userId} role={team.role} />
        <TeamRolesPanel teamId={team.id} currentRole={team.role} />
        <section className="team-section"><h3>Рейтинг участников</h3>{team.members.map((member, index) => <div className="member-rank" key={member.id}><i>#{index + 1}</i><SocialAvatar user={member} size="small" /><span><b>{member.name}</b><small>{member.xp} XP за неделю</small></span><strong>{Math.max(80, 360 - index * 90)} XP</strong></div>)}</section></div>
      <section className="team-chat"><h3>Общий чат</h3><div>{messages.map((message, index) => <p key={`${message}-${index}`}><b>{index ? 'Ты' : 'GoalQuest'}</b>{message}</p>)}</div><form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const message = new FormData(form).get('message')?.toString().trim(); if (message) setMessages((old) => [...old, message]); form.reset(); }}><input name="message" placeholder="Сообщение команде…" /><button>➤</button></form></section>
    </div>
    <div className="danger-actions"><button onClick={onBack}>Выйти из команды</button><button onClick={() => confirm('Удалить команду навсегда?') && onDelete()}>Удалить команду</button></div>
  </section>;
}

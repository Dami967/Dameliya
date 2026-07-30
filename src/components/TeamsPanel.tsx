import { useState } from 'react';
import { teams } from '../lib/socialData';
import type { CreatedTeam } from '../lib/collaborationData';
import { TeamDetail } from './TeamDetail';

export function TeamsPanel({ createdTeam, userId, onCreate, onDelete }: { createdTeam: CreatedTeam | null; userId: string; onCreate: () => void; onDelete: () => void }) {
  const [joined, setJoined] = useState<string[]>(teams.filter((team) => team.joined).map((team) => team.name));
  const [opened, setOpened] = useState(Boolean(createdTeam));
  if (createdTeam && opened) return <TeamDetail team={createdTeam} userId={userId} onBack={() => setOpened(false)} onDelete={onDelete} />;
  return (
    <section>
      <div className="teams-hero"><div><span>СИЛЬНЕЕ ВМЕСТЕ</span><h2>Команды GoalQuest</h2><p>Общие задания, чат и награды за командные победы.</p></div><button className="social-primary" onClick={onCreate}>+ Создать команду</button></div>
      {createdTeam && <button className="created-team-banner" onClick={() => setOpened(true)}>✨ <span><b>{createdTeam.name}</b><small>Твоя новая команда · открыть страницу</small></span><i>→</i></button>}
      <div className="team-grid">{teams.map((team) => {
        const isJoined = joined.includes(team.name);
        return <article className="team-card" key={team.name}>
          <div className="team-card-head"><span>{team.emoji}</span><i>#{team.rank} в рейтинге</i></div>
          <h3>{team.name}</h3><p>{team.topic} · {team.members} участников</p>
          <div className="team-progress-label"><span>Общий прогресс</span><b>{team.progress}%</b></div>
          <div className="team-progress"><span style={{ width: `${team.progress}%` }} /></div>
          <div className="team-tags"><span>💬 Общий чат</span><span>🏆 8 наград</span><span>✓ 12 заданий</span></div>
          <button className={isJoined ? 'social-outline' : 'social-primary'} onClick={() => {
            if (!isJoined) setJoined((old) => [...old, team.name]);
          }}>{isJoined ? 'Открыть команду' : 'Вступить'}</button>
        </article>;
      })}</div>
    </section>
  );
}

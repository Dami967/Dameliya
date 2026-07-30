import { useCallback, useEffect, useState } from 'react';
import { changeTeamMemberRole, inviteTeamMember, loadTeamMembers, type StoredTeamMember } from '../lib/teamRepository';
import type { CreatedTeam } from '../lib/collaborationData';

const labels: Record<CreatedTeam['role'], string> = {
  creator: 'Создатель',
  admin: 'Администратор',
  member: 'Участник',
};

export function TeamRolesPanel({ teamId, currentRole }: { teamId: string; currentRole: CreatedTeam['role'] }) {
  const [members, setMembers] = useState<StoredTeamMember[]>([]);
  const [message, setMessage] = useState('');
  const canManage = currentRole !== 'member';
  const refresh = useCallback(() => void loadTeamMembers(teamId).then(setMembers), [teamId]);
  useEffect(refresh, [refresh]);

  async function invite() {
    const username = prompt('Username участника GoalQuest'); if (!username?.trim()) return;
    const result = await inviteTeamMember(teamId, username.trim());
    if (result.error) return setMessage(result.error.message.includes('not found') ? 'Пользователь не найден.' : result.error.message);
    setMessage('Участник добавлен ✓'); refresh();
  }

  async function changeRole(member: StoredTeamMember, role: 'admin' | 'member') {
    const result = await changeTeamMemberRole(teamId, member.userId, role);
    result.error ? setMessage(result.error.message) : refresh();
  }

  return <section className="team-section team-roles">
    <header><div><span>РОЛИ И ДОСТУП</span><h3>Участники команды</h3></div>{canManage && <button onClick={invite}>+ Пригласить</button>}</header>
    {members.map((member) => <article key={member.userId}>
      <i>{member.name[0]?.toUpperCase()}</i><div><b>{member.name}</b><small>@{member.username || 'goalquest'} · {labels[member.role]}</small></div>
      {canManage && member.role !== 'creator' && <select value={member.role} onChange={(event) => void changeRole(member, event.target.value as 'admin' | 'member')}>
        <option value="member">Участник</option><option value="admin">Администратор</option>
      </select>}
    </article>)}
    {message && <p className="form-error">{message}</p>}
  </section>;
}

import { useCallback, useEffect, useState } from 'react';
import { addStage, createTeamQuest, deleteStage, loadTeamQuest, proposeStageChange,
  reviewProposal, saveStageNotes, setStageDone, subscribeTeamQuest, undoLastTeamChange,
  updateStage, type TeamGoal, type TeamHistory, type TeamProposal, type TeamStage } from '../lib/teamQuest';
import { TeamQuestHistory } from './TeamQuestHistory';
import { TeamQuestStage } from './TeamQuestStage';

type Role = 'creator' | 'admin' | 'member';
const roleNames: Record<Role, string> = { creator: 'Создатель', admin: 'Администратор', member: 'Участник' };

export function TeamQuestPanel({ teamId, userId, role }: { teamId: string; userId: string; role: Role }) {
  const [goal, setGoal] = useState<TeamGoal | null>(null);
  const [stages, setStages] = useState<TeamStage[]>([]);
  const [history, setHistory] = useState<TeamHistory[]>([]);
  const [proposals, setProposals] = useState<TeamProposal[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [active, setActive] = useState(0);
  const [message, setMessage] = useState('');
  const canManage = role !== 'member';

  const refresh = useCallback(async () => {
    const result = await loadTeamQuest(teamId);
    setGoal(result.goal); setStages(result.stages); setHistory(result.history);
    setProposals(result.proposals); setActorNames(result.actorNames ?? {});
    setActive((value) => Math.min(value, Math.max(result.stages.length - 1, 0)));
    if (result.error) setMessage(result.error.message);
  }, [teamId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!goal) return;
    const channel = subscribeTeamQuest(goal.id, () => void refresh());
    return () => { void channel.unsubscribe(); };
  }, [goal?.id, refresh]);

  async function createGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const result = await createTeamQuest(teamId, userId, String(form.get('title')), String(form.get('description')));
    result.error ? setMessage(result.error.message) : void refresh();
  }

  if (!goal) return <section className="team-section shared-quest-empty">
    <span>🗺️</span><h3>Создайте общую цель</h3><p>Это будет один проект и одна карта для всей команды.</p>
    {canManage ? <form onSubmit={createGoal}><input name="title" required minLength={2} placeholder="Название общей цели" />
      <textarea name="description" placeholder="Какого результата хочет достичь команда?" />
      <button className="social-primary">Создать общий квест</button></form> : <small>Создатель или администратор скоро добавит цель.</small>}
    {message && <p className="form-error">{message}</p>}
  </section>;

  const activeGoal = goal;
  const stage = stages[active];
  return <section className="shared-quest">
    <header className="shared-quest-head"><div><span>ЕДИНЫЙ ПРОЕКТ · {roleNames[role]}</span><h2>{activeGoal.title}</h2><p>{activeGoal.description}</p></div>
      <strong>{activeGoal.progress}%<small>общий прогресс</small></strong></header>
    <div className="team-progress"><span style={{ width: `${activeGoal.progress}%` }} /></div>
    <div className="shared-quest-layout">
      <div>{stage ? <TeamQuestStage stage={stage} current={active} total={stages.length} canManage={canManage}
        onPrevious={() => setActive((value) => Math.max(0, value - 1))}
        onNext={() => setActive((value) => Math.min(stages.length - 1, value + 1))}
        onDone={(done) => void setStageDone(stage.id, done)}
        onNotes={(notes) => void saveStageNotes(stage.id, notes)}
        onEdit={() => void editStage(stage)}
        onDelete={() => confirm('Удалить этап для всей команды?') && void deleteStage(stage.id)}
        onAddMaterial={() => void addMaterial(stage)}
        onRemoveMaterial={(index) => void removeMaterial(stage, index)}
        onPropose={() => void createProposal(stage)} /> : <p>Добавьте первый этап.</p>}
        {canManage && <button className="add-stage-button" onClick={() => void createStage()}>+ Добавить этап</button>}
      </div>
      <TeamQuestHistory history={history} proposals={proposals} actorNames={actorNames} canManage={canManage}
        onUndo={() => void undoLastTeamChange(activeGoal.id)}
        onReview={(proposal, accepted) => void reviewProposal(proposal.id, accepted ? 'approved' : 'rejected', userId)} />
    </div>
    {message && <p className="form-error">{message}</p>}
  </section>;

  async function createStage() {
    const title = prompt('Название нового этапа'); if (!title?.trim()) return;
    const position = stages.length ? Math.max(...stages.map((item) => item.position)) + 1 : 0;
    const result = await addStage(activeGoal.id, userId, position, title.trim());
    if (result.error) setMessage(result.error.message);
  }
  async function editStage(item: TeamStage) {
    const title = prompt('Название этапа', item.title); if (!title?.trim()) return;
    const description = prompt('Описание этапа', item.description) ?? item.description;
    const result = await updateStage(item.id, { title: title.trim(), description });
    if (result.error) setMessage(result.error.message);
  }
  async function createProposal(item: TeamStage) {
    const summary = prompt('Что ты предлагаешь изменить?'); if (!summary?.trim()) return;
    const result = await proposeStageChange({ goal_id: activeGoal.id, stage_id: item.id, author_id: userId,
      kind: 'edit', summary: summary.trim(), payload: {} });
    if (result.error) setMessage(result.error.message);
  }
  async function addMaterial(item: TeamStage) {
    const label = prompt('Название материала'); if (!label?.trim()) return;
    const url = prompt('Ссылка на материал'); if (!url?.trim()) return;
    const result = await updateStage(item.id, { materials: [...item.materials, { label: label.trim(), url: url.trim() }] });
    if (result.error) setMessage(result.error.message);
  }
  async function removeMaterial(item: TeamStage, index: number) {
    const result = await updateStage(item.id, { materials: item.materials.filter((_, itemIndex) => itemIndex !== index) });
    if (result.error) setMessage(result.error.message);
  }
}

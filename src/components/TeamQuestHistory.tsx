import type { TeamHistory, TeamProposal } from '../lib/teamQuest';

type TeamQuestHistoryProps = {
  history: TeamHistory[];
  proposals: TeamProposal[];
  actorNames: Record<string, string>;
  canManage: boolean;
  onUndo: () => void;
  onReview: (proposal: TeamProposal, accepted: boolean) => void;
};

export function TeamQuestHistory(props: TeamQuestHistoryProps) {
  return (
    <aside className="team-quest-side">
      <section>
        <header><div><span>ИСТОРИЯ</span><h4>Последние изменения</h4></div>
          {props.canManage && <button onClick={props.onUndo} disabled={!props.history.some((item) => !item.undone_at)}>↶ Отменить</button>}
        </header>
        <div className="team-history-list">
          {props.history.length === 0 && <p>Изменений пока нет.</p>}
          {props.history.map((item) => <article className={item.undone_at ? 'is-undone' : ''} key={item.id}>
            <i>✦</i><div><b>{item.summary}</b><span>{props.actorNames[item.actor_id] || 'Участник команды'} · {formatTime(item.created_at)}</span></div>
          </article>)}
        </div>
      </section>
      <section>
        <header><div><span>ПРЕДЛОЖЕНИЯ</span><h4>Идеи участников</h4></div></header>
        <div className="team-proposal-list">
          {props.proposals.length === 0 && <p>Новых предложений нет.</p>}
          {props.proposals.map((proposal) => <article key={proposal.id}>
            <b>{proposal.summary}</b><small>{proposal.status === 'pending' ? 'Ждёт решения' : proposal.status === 'approved' ? 'Принято ✓' : 'Отклонено'}</small>
            {props.canManage && proposal.status === 'pending' && <div>
              <button onClick={() => props.onReview(proposal, true)}>Принять</button>
              <button onClick={() => props.onReview(proposal, false)}>Отклонить</button>
            </div>}
          </article>)}
        </div>
      </section>
    </aside>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

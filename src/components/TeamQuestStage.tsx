import { useEffect, useState } from 'react';
import type { TeamStage } from '../lib/teamQuest';

type TeamQuestStageProps = {
  stage: TeamStage;
  current: number;
  total: number;
  canManage: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onDone: (done: boolean) => void;
  onNotes: (notes: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onPropose: () => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
};

export function TeamQuestStage(props: TeamQuestStageProps) {
  const [notes, setNotes] = useState(props.stage.notes);
  useEffect(() => setNotes(props.stage.notes), [props.stage.id, props.stage.notes]);
  return (
    <article className="shared-stage" key={props.stage.id}>
      <nav className="stage-navigation">
        <button onClick={props.onPrevious} disabled={props.current === 0}>← Назад</button>
        <span>Этап {props.current + 1} из {props.total}</span>
        <button onClick={props.onNext} disabled={props.current === props.total - 1}>Вперёд →</button>
      </nav>
      <div className="shared-stage-title">
        <label className={props.stage.status === 'done' ? 'is-done' : ''}>
          <input type="checkbox" checked={props.stage.status === 'done'} onChange={(event) => props.onDone(event.target.checked)} />
          <span><small>{props.stage.status === 'done' ? 'ВЫПОЛНЕНО КОМАНДОЙ' : 'ТЕКУЩИЙ ЭТАП'}</small><h3>{props.stage.title}</h3></span>
        </label>
        {props.canManage && <div><button onClick={props.onEdit}>Редактировать</button><button onClick={props.onDelete}>Удалить</button></div>}
      </div>
      <p>{props.stage.description || 'Команда вместе работает над этим этапом.'}</p>
      <section className="stage-notes">
        <label>Общие заметки<textarea value={notes} onChange={(event) => setNotes(event.target.value)}
          placeholder="Идеи, решения и важные детали видны всей команде…" /></label>
        <button onClick={() => props.onNotes(notes)}>Сохранить заметку</button>
      </section>
      <section className="stage-materials">
        <b>Материалы</b>
        {props.stage.materials.length === 0 ? <span>Материалов пока нет</span> : props.stage.materials.map((material) =>
          <span className="stage-material" key={`${material.url}-${material.label}`}>
            <a href={material.url} target="_blank" rel="noreferrer">↗ {material.label}</a>
            {props.canManage && <button onClick={() => props.onRemoveMaterial(props.stage.materials.indexOf(material))} aria-label={`Удалить ${material.label}`}>×</button>}
          </span>)}
        {props.canManage && <button className="add-material" onClick={props.onAddMaterial}>+ Материал</button>}
      </section>
      {!props.canManage && <button className="proposal-button" onClick={props.onPropose}>💡 Предложить изменение</button>}
    </article>
  );
}

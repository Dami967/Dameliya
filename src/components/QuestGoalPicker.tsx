import { questDisplayTitle, type AiQuestPlan } from '../lib/aiQuest';

type QuestGoalPickerProps = {
  plans: AiQuestPlan[];
  selectedId: string | null;
  onChange: (id: string) => void;
};

export function QuestGoalPicker({ plans, selectedId, onChange }: QuestGoalPickerProps) {
  if (!plans.length) return null;

  return <label className="quest-goal-picker">
    <span>Выбрать цель</span>
    <select value={selectedId ?? plans[0].id} onChange={(event) => onChange(event.target.value)}>
      {plans.map((plan) => <option key={plan.id} value={plan.id}>{questDisplayTitle(plan)}</option>)}
    </select>
    {plans.length === 1 && <small>Сейчас у тебя одна цель. Новую можно добавить ниже.</small>}
  </label>;
}

export function QuestGoalTabs({ plans, selectedId, onChange }: QuestGoalPickerProps) {
  if (!plans.length) return null;

  return <nav className="quest-goal-tabs" aria-label="Карты целей">
    {plans.map((plan, index) => <button type="button" key={plan.id}
      className={plan.id === selectedId ? 'is-active' : ''} onClick={() => onChange(plan.id)}>
      <span>{index + 1}</span>{questDisplayTitle(plan)}
    </button>)}
  </nav>;
}

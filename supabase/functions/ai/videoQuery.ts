export function videoSearchQuery(context: string) {
  const goal = context.match(/Цель(?: пользователя)?:\s*([^\n]+?)(?=\.\s*(?:Задание|Этап):|$)/iu)?.[1] ?? '';
  const task = context.match(/(?:Задание|Этап):\s*([^\n.]+)/iu)?.[1] ?? '';
  return (task || goal ? `${task.slice(0, 100)} ${goal.split('.')[0].slice(0, 100)}` : context.slice(0, 180))
    .replace(/\b(?:https?:\/\/\S+)\b/gu, '').replace(/\s+/g, ' ').trim();
}

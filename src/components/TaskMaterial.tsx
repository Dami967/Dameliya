import { useEffect, useState } from 'react';
import { askAi } from '../lib/ai';
import type { QuestResource } from '../lib/questData';

export function TaskMaterial({ resource, task, onClose }: {
  resource: QuestResource;
  task: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState('');

  useEffect(() => {
    let active = true;
    void askAi(
      `Создай короткий учебный материал внутри приложения.
Тема: ${resource.title}.
Описание: ${resource.description}.
Задание пользователя: ${task}.
Объясни тему простыми словами, дай один пример и 3 конкретных шага применения. Не добавляй ссылки. Пиши на языке темы и задания.`,
      'Ты — Кью, добрый AI-наставник для подростков. Дай полезный самостоятельный материал без markdown-ссылок и внешних сайтов.',
    ).then((result) => {
      if (!active) return;
      if (result.text) setContent(result.text);
      else setContent(fallbackMaterial(resource, task));
    });
    return () => { active = false; };
  }, [resource.description, resource.title, task]);

  return <div className="task-material-backdrop"><section className="task-material">
    <header><button type="button" onClick={onClose}>← Назад к заданию</button><span>МАТЕРИАЛ ОТ КЬЮ</span></header>
    <div className="task-material__body"><span className="task-material__icon">✦</span>
      <h2>{resource.title}</h2><p className="task-material__intro">{resource.description}</p>
      {content ? <div className="task-material__content">{content}</div>
        : <p className="task-material__loading">Кью готовит материал…</p>}
    </div>
  </section></div>;
}

function fallbackMaterial(resource: QuestResource, task: string) {
  return `Главная идея\n${resource.description}\n\nКак применить к заданию «${task}»\n1. Выдели один конкретный результат.\n2. Определи, как проверить его выполнение.\n3. Запиши ближайший небольшой шаг и срок.`;
}

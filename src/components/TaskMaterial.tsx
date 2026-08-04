import { useEffect, useState } from 'react';
import { askAi } from '../lib/ai';
import type { QuestResource } from '../lib/questData';
import { detectLanguage, languageName } from '../lib/languages';

export function TaskMaterial({ resource, task, onClose }: {
  resource: QuestResource;
  task: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState(detectLanguage);

  useEffect(() => {
    const changed = (event: Event) => setLanguage((event as CustomEvent<string>).detail || detectLanguage());
    window.addEventListener('goalquest-language-changed', changed);
    return () => window.removeEventListener('goalquest-language-changed', changed);
  }, []);

  useEffect(() => {
    let active = true;
    void askAi(
      `Создай короткий учебный материал внутри приложения.
Тема: ${resource.title}.
Описание: ${resource.description}.
Задание пользователя: ${task}.
Объясни тему простыми словами, дай один пример и 3 конкретных шага применения. Не добавляй ссылки.`,
      `Ты — Кью, добрый AI-наставник для подростков. Пиши только на языке ${languageName(language)}. Дай полезный самостоятельный материал без markdown-ссылок и внешних сайтов.`,
    ).then((result) => {
      if (!active) return;
      if (result.text) setContent(result.text);
      else setContent(fallbackMaterial(resource, task, language));
    });
    return () => { active = false; };
  }, [language, resource.description, resource.title, task]);

  return <div className="task-material-backdrop"><section className="task-material">
    <header><button type="button" onClick={onClose}>← Назад к заданию</button><span>МАТЕРИАЛ ОТ КЬЮ</span></header>
    <div className="task-material__body"><span className="task-material__icon">✦</span>
      <h2>{resource.title}</h2><p className="task-material__intro">{resource.description}</p>
      {content ? <div className="task-material__content">{content}</div>
        : <p className="task-material__loading">Кью готовит материал…</p>}
    </div>
  </section></div>;
}

function fallbackMaterial(resource: QuestResource, task: string, language: string) {
  if (language === 'ru') return `Главная идея\n${resource.description}\n\nКак применить к заданию «${task}»\n1. Выдели один конкретный результат.\n2. Определи, как проверить его выполнение.\n3. Запиши ближайший небольшой шаг и срок.`;
  if (language === 'kk') return `Негізгі ой\n${resource.description}\n\n«${task}» тапсырмасына қалай қолдануға болады\n1. Бір нақты нәтижені таңда.\n2. Оның орындалуын қалай тексеретініңді анықта.\n3. Келесі шағын қадам мен мерзімді жаз.`;
  return `Main idea\n${resource.description}\n\nHow to apply it to “${task}”\n1. Choose one concrete result.\n2. Decide how you will verify it.\n3. Write down the next small step and its deadline.`;
}

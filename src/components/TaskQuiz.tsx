import { useEffect, useState } from 'react';
import { askAi, parseAiJson } from '../lib/ai';
import type { QuestResource } from '../lib/questData';

type Question = { question: string; options: string[]; correct_index: number; explanation: string };

export function TaskQuiz({ resource, task, onClose }: {
  resource: QuestResource; task: string; onClose: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');
  const finished = questions.length > 0 && index >= questions.length;

  useEffect(() => {
    let active = true;
    void createQuestions(resource, task).then((result) => {
      if (!active) return;
      if (result.length === 5) setQuestions(result);
      else setError('Не получилось создать тест. Попробуй ещё раз.');
    });
    return () => { active = false; };
  }, [resource, task]);

  const current = questions[index];
  function choose(option: number) {
    if (answer !== null || !current) return;
    setAnswer(option);
    if (option === current.correct_index) setScore((value) => value + 1);
  }
  function next() { setIndex((value) => value + 1); setAnswer(null); }
  function restart() { setIndex(0); setAnswer(null); setScore(0); }

  return <div className="task-material-backdrop"><section className="task-material task-quiz">
    <header><button type="button" onClick={onClose}>← Назад к заданию</button><span>ТЕСТ ОТ КЬЮ</span></header>
    <div className="task-material__body">
      <span className="task-material__icon">✓</span><h2>{resource.title}</h2>
      {!questions.length && !error && <p className="task-material__loading">Кью создаёт вопросы по твоему заданию…</p>}
      {error && <><p className="momentum-feedback">{error}</p><button className="social-primary" onClick={onClose}>Вернуться</button></>}
      {current && <><div className="momentum-question-progress"><span>Вопрос {index + 1} из 5</span>
        <i><b style={{ width: `${(index + 1) * 20}%` }} /></i></div><h3>{current.question}</h3>
        <div className="momentum-options">{current.options.map((option, optionIndex) =>
          <button key={option} disabled={answer !== null} className={answer === null ? ''
            : optionIndex === current.correct_index ? 'is-correct' : optionIndex === answer ? 'is-wrong' : ''}
            onClick={() => choose(optionIndex)}>{option}</button>)}</div>
        {answer !== null && <><p className="momentum-feedback">{answer === current.correct_index ? 'Верно! ' : 'Пока неверно. '}
          {current.explanation}</p><button className="social-primary" onClick={next}>
            {index === 4 ? 'Узнать результат' : 'Следующий вопрос'}</button></>}
      </>}
      {finished && <div className="task-quiz__result"><span>🏆</span><h3>{score} из 5</h3>
        <p>{score >= 4 ? 'Отличный результат!' : 'Попробуй ещё раз — теперь ты знаешь ответы лучше.'}</p>
        <button className="social-primary" onClick={restart}>Пройти ещё раз</button></div>}
    </div>
  </section></div>;
}

async function createQuestions(resource: QuestResource, task: string) {
  const result = await askAi(`Создай тест по этому заданию. Тема: ${resource.title}. ${resource.description}. ${task}
Ровно 5 разных вопросов, в каждом 3 варианта и один правильный. Добавь короткое объяснение.
Верни JSON: {"questions":[{"question":"вопрос","options":["вариант 1","вариант 2","вариант 3"],"correct_index":0,"explanation":"почему"}]}.`,
  'Создай полезный диагностический тест для подростка на языке задания. Только валидный JSON.', [], false, true);
  try {
    const value = parseAiJson<{ questions?: Partial<Question>[] }>(result.text ?? '');
    return (value.questions ?? []).flatMap((item) => {
      const options = Array.isArray(item.options) ? item.options.map(String) : [];
      const correct = Number(item.correct_index);
      return item.question && options.length === 3 && Number.isInteger(correct) && correct >= 0 && correct < 3
        ? [{ question: String(item.question), options, correct_index: correct,
          explanation: String(item.explanation || 'Это правильный ответ.') }] : [];
    }).slice(0, 5);
  } catch { return []; }
}

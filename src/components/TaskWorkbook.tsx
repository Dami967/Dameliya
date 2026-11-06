import { useState } from 'react';
import type { TaskLesson } from '../lib/taskLesson';
import { readExerciseNotes, writeExerciseNotes } from '../lib/exerciseAnswers';
import { LearningText } from './LearningText';

export function TaskWorkbook({ lesson, notes, readOnly, onNotes }: {
  lesson: TaskLesson; notes: string; readOnly: boolean; onNotes: (value: string) => void;
}) {
  const saved = readExerciseNotes(notes);
  const [tab, setTab] = useState<'theory' | 'examples' | 'practice'>('theory');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  function updateAnswer(index: number, value: string) {
    const answers = lesson.exercises.map((_, i) => i === index ? value : saved.answers[i] ?? '');
    onNotes(writeExerciseNotes(saved.notes, answers, lesson));
  }
  return <section className="content-card task-workbook">
    <h2>Твой урок</h2>
    <nav className="workbook-tabs" aria-label="Части урока">
      {(['theory', 'examples', 'practice'] as const).map((item, index) => <button key={item}
        aria-pressed={tab === item} onClick={() => setTab(item)}>{['Объяснение', 'Примеры', 'Практика'][index]}</button>)}
    </nav>
    {tab === 'theory' && <><div className="workbook-theory"><LearningText text={lesson.explanation} /></div>
      <button className="primary-button" onClick={() => setTab('examples')}>Перейти к примерам →</button></>}
    {tab === 'examples' && <>{lesson.examples.map((example, index) => <details className="workbook-example" key={index} open={index === 0}>
      <summary>Пример {index + 1}</summary>
      <h4>Пример {index + 1}. <LearningText text={example.question} /></h4>
      <ol>{example.steps.map((step, i) => <li key={i}><LearningText text={step} /></li>)}</ol>
      <p><b>Ответ: </b><LearningText text={example.answer} /></p>
    </details>)}<button className="primary-button" onClick={() => setTab('practice')}>Попробовать самому →</button></>}
    {tab === 'practice' && <><nav className="exercise-navigation" aria-label="Упражнения">
      {lesson.exercises.map((_, index) => <button key={index} aria-pressed={exerciseIndex === index}
        onClick={() => setExerciseIndex(index)}>{saved.answers[index]?.trim() ? '✓ ' : ''}{index + 1}</button>)}
    </nav>{lesson.exercises.map((exercise, index) => index === exerciseIndex && <article className="workbook-exercise" key={index}>
      <label htmlFor={`exercise-${index}`}><b>Упражнение {index + 1}</b><LearningText text={exercise.question} /></label>
      <textarea id={`exercise-${index}`} value={saved.answers[index] ?? ''} readOnly={readOnly}
        placeholder="Впиши ответ и, если нужно, ход решения…" onChange={(event) => updateAnswer(index, event.target.value)} />
      <details><summary>Подсказка</summary><LearningText text={exercise.hint} /></details>
    </article>)}{exerciseIndex < lesson.exercises.length - 1 && <button className="primary-button"
      onClick={() => setExerciseIndex(exerciseIndex + 1)}>Следующее упражнение →</button>}</>}
    <small>Ответы сохраняются вместе с заданием. Для проверки нажми «Я выполнила задание» ниже.</small>
  </section>;
}

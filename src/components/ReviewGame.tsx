import { useState } from 'react';
import type { ReviewQuestion } from '../lib/questReview';
import { LearningText } from './LearningText';

export function ReviewGame({ questions, onFinish, busy, initialMode = 'quiz', submitLabel = 'Сохранить результат' }: {
  submitLabel?: string; initialMode?: 'quiz' | 'cards'; questions: ReviewQuestion[]; onFinish: (answers: number[]) => void; busy: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [cards, setCards] = useState(initialMode === 'cards');
  const [revealed, setRevealed] = useState(false);
  const question = questions[index];
  const selected = answers[index];
  return <section className="content-card review-game">
    <div className="workbook-tabs"><button aria-pressed={!cards} onClick={() => { setCards(false); setRevealed(false); }}>Викторина</button>
      <button aria-pressed={cards} onClick={() => { setCards(true); setRevealed(false); }}>Карточки для повторения</button></div>
    <p>{cards ? 'Карточка' : 'Вопрос'} {index + 1} из {questions.length}</p>
    <h2><LearningText text={question.question} /></h2>
    {cards ? <><button className="primary-button" onClick={() => setRevealed(!revealed)}>{revealed ? 'Скрыть ответ' : 'Перевернуть карточку'}</button>
      {revealed && <p><LearningText text={`${question.options[question.correct]}\n${question.explanation}`} /></p>}</>
      : <div className="review-options">{question.options.map((option, optionIndex) => <button key={optionIndex}
        disabled={selected !== undefined} aria-pressed={selected === optionIndex}
        className={selected === undefined ? '' : optionIndex === question.correct ? 'is-correct'
          : selected === optionIndex ? 'is-incorrect' : ''}
        onClick={() => setAnswers((current) => { const next = [...current]; next[index] = optionIndex; return next; })}>
        <LearningText text={option} /></button>)}
        {selected !== undefined && <p role="status"><b>Объяснение задания: </b>
          <LearningText text={question.explanation} /></p>}</div>}
    <div className="review-navigation"><button disabled={index === 0} onClick={() => { setIndex(index - 1); setRevealed(false); }}>← Назад</button>
      {index < questions.length - 1 ? <button disabled={!cards && selected === undefined}
        onClick={() => { setIndex(index + 1); setRevealed(false); }}>Дальше →</button>
        : !cards && <button disabled={busy || answers.filter((item) => Number.isInteger(item)).length !== questions.length}
          onClick={() => onFinish(answers)}>{busy ? 'Сохраняем…' : submitLabel}</button>}</div>
    {cards && <small>Карточки помогают повторить тему. Чтобы записать результат, пройди викторину.</small>}
  </section>;
}

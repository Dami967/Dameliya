import { LearningText } from './LearningText';
import type { ValidationResult } from '../lib/taskValidation';

export function TaskValidationResult({ result }: { result: ValidationResult }) {
  return <section className={`task-review ${result.passed ? 'is-passed' : ''}`}>
    <header><div><span>{result.passed ? '✓' : '!'}</span><div><b>Проверка Кью</b><p><LearningText text={result.feedback} /></p></div></div></header>
    <details><summary>Показать эталон правильного результата</summary><p><LearningText text={result.expected_answer} /></p></details>
    <div className="task-review__items">{result.comparisons.map((item, index) =>
      <article className={item.is_correct ? 'is-correct' : 'has-error'} key={`${item.criterion}-${index}`}>
        <h3><span>{item.is_correct ? '✓' : '×'}</span>{item.criterion}</h3>
        <div><small>ТВОЙ ОТВЕТ</small><p><LearningText text={item.user_answer} /></p></div>
        <div><small>ПРАВИЛЬНЫЙ ВАРИАНТ</small><p><LearningText text={item.correct_answer} /></p></div>
        <footer><LearningText text={item.explanation} /></footer>
      </article>)}</div>
  </section>;
}

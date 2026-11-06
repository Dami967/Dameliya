import { readableMath } from '../lib/readableMath';

export function LearningText({ text }: { text: string }) {
  return <span className="learning-text">{readableMath(text)}</span>;
}

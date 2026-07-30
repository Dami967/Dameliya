import { LegalDocument } from '../components/LegalDocument';
import { termsSections } from '../lib/legalContent';

export function TermsPage() {
  return <LegalDocument eyebrow="ПРАВИЛА GOALQUEST" title="Условия использования"
    intro="Эти правила помогают сделать GoalQuest безопасным, честным и полезным пространством для саморазвития."
    sections={termsSections} />;
}

import { LegalDocument } from '../components/LegalDocument';
import { privacySections } from '../lib/legalContent';

export function PrivacyPage() {
  return <LegalDocument eyebrow="PRIVACY & SUPPORT" title="Политика конфиденциальности"
    intro="Здесь объясняется, какие данные нужны GoalQuest, как они используются и как ты можешь ими управлять."
    sections={privacySections} />;
}

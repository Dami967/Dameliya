import { Link } from 'wouter';
import type { LegalSection } from '../lib/legalContent';
import { AppShell } from './AppShell';
import { Icon } from './Icon';

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalDocument({ eyebrow, title, intro, sections }: Props) {
  return (
    <AppShell>
      <div className="document-shell">
        <Link href="/settings" className="document-back"><Icon name="arrow" size={15} /> Назад к настройкам</Link>
        <header className="document-header">
          <span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p>
          <div className="document-meta"><span>Версия от 29 июля 2026</span><span>Простой и понятный язык</span></div>
        </header>
        <article className="legal-document">
          {sections.map((section) => <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
          </section>)}
          <aside><Icon name="shield" size={20} /><div><b>Коротко о главном</b>
            <p>Твои данные и прогресс принадлежат тебе. Настройки аккаунта позволяют управлять ими.</p></div></aside>
        </article>
      </div>
    </AppShell>
  );
}

import { Link } from 'wouter';
import { Icon } from './Icon';

export function SettingsSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return <section className="settings-card settings-section">
    <div className="settings-section__title"><span><Icon name={icon} size={19} /></span><h2>{title}</h2></div>
    <div>{children}</div>
  </section>;
}

type RowProps = {
  title: string;
  detail?: string;
  danger?: boolean;
  onClick?: () => void;
  href?: string;
  trailing?: React.ReactNode;
};

export function SettingsRow({ title, detail, danger, onClick, href, trailing }: RowProps) {
  const content = <><span><b>{title}</b>{detail && <small>{detail}</small>}</span>{trailing ?? <i>›</i>}</>;
  const className = `settings-row ${danger ? 'settings-row--danger' : ''}`;
  if (href) return <Link className={className} href={href}>{content}</Link>;
  return <button type="button" className={className} onClick={onClick}>{content}</button>;
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span /></label>;
}

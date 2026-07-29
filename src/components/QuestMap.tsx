import { Link } from 'wouter';
import { questSteps } from '../lib/questData';
import { Icon } from './Icon';

export function QuestMap() {
  return (
    <section className="quest-card">
      <div className="section-heading">
        <div><span className="eyebrow">КАРТА ПРИКЛЮЧЕНИЯ</span><h2>Долина больших идей</h2></div>
        <span className="progress-pill"><Icon name="star" size={13} /> 2 / 10</span>
      </div>
      <div className="quest-map">
        <div className="quest-scenery quest-scenery--one">✦</div>
        <div className="quest-scenery quest-scenery--two">☁</div>
        <svg className="quest-path" viewBox="0 0 500 440" preserveAspectRatio="none" aria-hidden="true">
          <path className="quest-path__shadow" d="M85 42 C420 72 410 132 168 138 S72 230 340 236 S410 330 145 342 S115 405 250 424" />
          <path className="quest-path__trail" d="M85 42 C420 72 410 132 168 138 S72 230 340 236 S410 330 145 342 S115 405 250 424" />
        </svg>
        {questSteps.map((step, index) => {
          const content = (
            <>
              <span className={`level-node level-node--${step.state}`}>
                <Icon name={step.state === 'locked' ? 'lock' : step.icon} size={25} />
                {step.state === 'active' && <i className="unlock-spark">✦</i>}
              </span>
              <span className="level-copy">
                <span className="level-row"><b>{step.title}</b><em>+{step.xp}</em></span>
                <small>{step.subtitle}</small>
              </span>
            </>
          );
          return step.state === 'active' ? (
            <Link href="/task" className={`level level--${step.state} level--${index}`} key={step.id}>{content}</Link>
          ) : (
            <div className={`level level--${step.state} level--${index}`} key={step.id}>
              {content}
            </div>
          );
        })}
        <div className="quest-treasure" aria-label="Награда в конце пути">🎁</div>
      </div>
    </section>
  );
}

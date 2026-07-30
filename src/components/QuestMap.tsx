import { useState } from 'react';
import { Link } from 'wouter';
import { questSteps, type QuestStep } from '../lib/questData';
import { Icon } from './Icon';

const chapters = [
  { title: 'Тропа идеи', subtitle: 'Задания 1–3', reward: 'Обычный сундук' },
  { title: 'Лес открытий', subtitle: 'Задания 4–6', reward: 'Редкий сундук' },
  { title: 'Гора смелости', subtitle: 'Задания 7–9', reward: 'Эпический сундук' },
  { title: 'Вершина', subtitle: 'Финальное задание', reward: '' },
];

export function QuestMap({ steps = questSteps, title = 'Долина больших идей' }: { steps?: QuestStep[]; title?: string }) {
  return (
    <section className="quest-card">
      <div className="section-heading">
        <div><span className="eyebrow">КАРТА ПРИКЛЮЧЕНИЯ</span><h2>{title}</h2></div>
        <span className="progress-pill"><Icon name="star" size={13} /> 2 / 10</span>
      </div>
      <div className="quest-map">
        <div className="quest-scenery quest-scenery--one">✦</div>
        <div className="quest-scenery quest-scenery--two">☁</div>
        {chapters.map((chapter, chapterIndex) => {
          const chapterSteps = steps.slice(chapterIndex * 3, chapterIndex * 3 + 3);
          if (!chapterSteps.length) return null;
          return <section className={`quest-chapter quest-chapter--${chapterIndex + 1}`} key={chapter.title}>
            <header><span>{chapterIndex + 1}</span><div><b>{chapter.title}</b><small>{chapter.subtitle}</small></div></header>
            <div className="quest-chapter__path">
              <svg className="chapter-route" viewBox="0 0 500 270" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient id={`route-${chapterIndex}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={chapterIndex === 0 ? '#9ee7a3' : '#cfc2ff'} />
                  <stop offset="1" stopColor={chapterIndex === 0 ? '#e4b6ff' : '#ad8df2'} />
                </linearGradient></defs>
                <path className="chapter-route__glow" d="M70 12 C260 35 330 62 185 94 S105 150 280 168 S340 220 125 258" />
                <path className="chapter-route__road" stroke={`url(#route-${chapterIndex})`} d="M70 12 C260 35 330 62 185 94 S105 150 280 168 S340 220 125 258" />
                <path className="chapter-route__steps" d="M70 12 C260 35 330 62 185 94 S105 150 280 168 S340 220 125 258" />
              </svg>
              <span className="chapter-scenery chapter-scenery--one">{chapterIndex === 0 ? '🌿' : chapterIndex === 1 ? '🌲' : '💎'}</span>
              <span className="chapter-scenery chapter-scenery--two">{chapterIndex === 0 ? '🌼' : chapterIndex === 1 ? '🌲' : '☁️'}</span>
              {chapterSteps.map((step, stepIndex) => <QuestLevel step={step} index={chapterIndex * 3 + stepIndex} key={step.id} />)}
            </div>
            {chapter.reward && <RewardStop title={chapter.reward} unlocked={chapterSteps.every((step) => step.state === 'done')} />}
          </section>;
        })}
      </div>
    </section>
  );
}

function QuestLevel({ step, index }: { step: QuestStep; index: number }) {
  const content = <><span className={`level-node level-node--${step.state}`}>
    <Icon name={step.state === 'locked' ? 'lock' : step.icon} size={25} />
    {step.state === 'active' && <i className="unlock-spark">✦</i>}
  </span><span className="level-copy"><span className="level-row"><b>{step.title}</b><em>+{step.xp}</em></span>
    <small>{step.subtitle}</small></span></>;
  return step.state === 'active'
    ? <Link href="/task" className={`level level--${step.state} level--${index}`}>{content}</Link>
    : <div className={`level level--${step.state} level--${index}`}>{content}</div>;
}

function RewardStop({ title, unlocked }: { title: string; unlocked: boolean }) {
  const [opened, setOpened] = useState(false);
  return <button type="button" disabled={!unlocked || opened} onClick={() => setOpened(true)}
    className={`reward-stop ${unlocked ? 'is-ready' : 'is-locked'} ${opened ? 'is-opened' : ''}`}>
    <span>{opened ? '✨' : '🎁'}</span>
    <div><small>ПОДАРОК ЗА 3 ЗАДАНИЯ</small><b>{title}</b></div>
    <em>{opened ? 'Открыт ✓' : unlocked ? 'Открыть' : 'Выполни все 3'}</em>
  </button>;
}

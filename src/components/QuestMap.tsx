import { useState } from 'react';
import { Link } from 'wouter';
import { questSteps, type QuestStep } from '../lib/questData';
import { Icon } from './Icon';

export function QuestMap({ steps = questSteps, title = 'Долина больших идей', planId }: {
  steps?: QuestStep[]; title?: string; planId?: string;
}) {
  const doneCount = steps.filter((step) => step.state === 'done').length;
  const chapters = Array.from({ length: Math.ceil(steps.length / 3) }, (_, index) => chapterInfo(index));
  return (
    <section className="quest-card">
      <div className="section-heading">
        <div><span className="eyebrow">КАРТА ПРИКЛЮЧЕНИЯ</span><h2>{title}</h2></div>
        <span className="progress-pill"><Icon name="star" size={13} /> {doneCount} / {steps.length}</span>
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
              {chapterSteps.map((step, stepIndex) => <QuestLevel step={step} planId={planId}
                index={chapterIndex * 3 + stepIndex} key={step.id} />)}
            </div>
            {chapter.reward && <RewardStop title={chapter.reward} unlocked={chapterSteps.every((step) => step.state === 'done')} />}
          </section>;
        })}
      </div>
    </section>
  );
}

function QuestLevel({ step, index, planId }: { step: QuestStep; index: number; planId?: string }) {
  const content = <><span className={`level-node level-node--${step.state}`}>
    <Icon name={step.state === 'locked' ? 'lock' : step.icon} size={25} />
    {step.state === 'active' && <i className="unlock-spark">✦</i>}
  </span><span className="level-copy"><span className="level-row"><b>{step.title}</b><em>+{step.xp}</em></span>
    <small>{step.subtitle}</small></span></>;
  return step.state === 'active' || step.state === 'done'
    ? <Link href={`/task/${step.id}${planId ? `?plan=${planId}` : ''}`}
      className={`level level--${step.state} level--${index}`}>{content}</Link>
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

function chapterInfo(index: number) {
  const names = ['Тропа открытий', 'Лес практики', 'Гора мастерства', 'Новый горизонт'];
  const first = index * 3 + 1;
  return {
    title: names[index % names.length],
    subtitle: `Задания ${first}–${first + 2}`,
    reward: ['Обычный сундук', 'Редкий сундук', 'Эпический сундук'][index % 3],
  };
}

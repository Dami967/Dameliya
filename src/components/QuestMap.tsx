import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { questSteps, type QuestStep } from '../lib/questData';
import { Icon } from './Icon';
import { loadQuestChestOpenings, openQuestChest } from '../lib/questChests';
import { asReward, createGeneratedReward, saveGeneratedChestReward } from '../lib/generatedRewards';

export function QuestMap({ steps = questSteps, title = 'Долина больших идей', planId }: {
  steps?: QuestStep[]; title?: string; planId?: string;
}) {
  const levelSize = 10;
  const totalDone = steps.filter((step) => step.state === 'done').length;
  const levelCount = Math.max(1, Math.ceil(steps.length / levelSize));
  const unlockedLevel = Math.min(levelCount - 1, Math.floor(totalDone / levelSize));
  const [selectedLevel, setSelectedLevel] = useState(unlockedLevel);
  const levelSteps = steps.slice(selectedLevel * levelSize, (selectedLevel + 1) * levelSize);
  const doneCount = levelSteps.filter((step) => step.state === 'done').length;
  const [openedChests, setOpenedChests] = useState<Record<number, string>>({});
  const chapters = Array.from({ length: Math.ceil(levelSteps.length / 3) }, (_, index) => chapterInfo(index));
  useEffect(() => { setSelectedLevel(unlockedLevel); }, [unlockedLevel]);
  useEffect(() => {
    if (!planId) return;
    void loadQuestChestOpenings(planId).then(({ data }) => setOpenedChests(Object.fromEntries(
      (data ?? []).map((opening) => [opening.chapter_index, opening.reward_label]),
    )));
  }, [planId]);
  return (
    <section className="quest-card">
      <div className="section-heading">
        <div><span className="eyebrow">КАРТА ПРИКЛЮЧЕНИЯ · УРОВЕНЬ {selectedLevel + 1}</span><h2>{title}</h2></div>
        <span className="progress-pill"><Icon name="star" size={13} /> {doneCount} / {levelSteps.length}</span>
      </div>
      <nav className="quest-level-tabs" aria-label="Уровни карты">{Array.from({ length: levelCount }, (_, index) =>
        <button key={index} disabled={index > unlockedLevel} className={selectedLevel === index ? 'is-active' : ''}
          onClick={() => setSelectedLevel(index)}>{index > unlockedLevel ? '🔒' : index < unlockedLevel ? '✓' : '✦'} Уровень {index + 1}</button>)}</nav>
      <div className="quest-map">
        <div className="quest-scenery quest-scenery--one">✦</div>
        <div className="quest-scenery quest-scenery--two">☁</div>
        {chapters.map((chapter, chapterIndex) => {
          const chapterSteps = levelSteps.slice(chapterIndex * 3, chapterIndex * 3 + 3);
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
            {chapter.reward && chapterSteps.length === 3 && <RewardStop title={chapter.reward}
              unlocked={chapterSteps.every((step) => step.state === 'done')} planId={planId}
              chapterIndex={selectedLevel * 100 + chapterIndex} prize={openedChests[selectedLevel * 100 + chapterIndex]}
              onOpened={(prize) => setOpenedChests((current) => ({ ...current, [selectedLevel * 100 + chapterIndex]: prize }))} />}
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

function RewardStop({ title, unlocked, planId, chapterIndex, prize, onOpened }: {
  title: string; unlocked: boolean; planId?: string; chapterIndex: number; prize?: string;
  onOpened: (prize: string) => void;
}) {
  const [opening, setOpening] = useState(false);
  async function open() {
    if (!planId || opening) return;
    setOpening(true);
    const result = await openQuestChest(planId, chapterIndex);
    if (!result.error && result.data === '🏆 Все уникальные призы уже собраны') {
      const generated = await createGeneratedReward('chest');
      if (generated) {
        const saved = await saveGeneratedChestReward(planId, chapterIndex, asReward(generated));
        if (!saved.error && typeof saved.data === 'string') onOpened(saved.data);
      }
    } else if (!result.error && typeof result.data === 'string') onOpened(result.data);
    setOpening(false);
  }
  return <button type="button" disabled={!unlocked || Boolean(prize) || opening} onClick={() => void open()}
    className={`reward-stop ${unlocked ? 'is-ready' : 'is-locked'} ${prize ? 'is-opened' : ''}`}>
    <span>{prize ? '✨' : '🎁'}</span>
    <div><small>ПОДАРОК ЗА 3 ЗАДАНИЯ</small><b>{prize || title}</b></div>
    <em>{prize ? 'Получен ✓' : opening ? 'Открываем…' : unlocked ? 'Открыть' : 'Выполни все 3'}</em>
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

import { useState } from 'react';
import { Link } from 'wouter';
import { GoalQuestIntro } from '../components/GoalQuestIntro';
import { WelcomeFeatures } from '../components/WelcomeFeatures';
import { Icon } from '../components/Icon';

export function WelcomePage() {
  const [isIntroOpen, setIsIntroOpen] = useState(false);

  return (
    <main className="welcome-page">
      <header className="welcome-header welcome-reveal">
        <Link href="/" className="welcome-brand" aria-label="GoalQuest — главная">
          <span><Icon name="star" size={25} /></span>
          GoalQuest
        </Link>
        <Link href="/auth?entry=app" className="welcome-login">Уже есть аккаунт? <b>Войти</b></Link>
      </header>

      <section className="welcome-hero">
        <div className="welcome-copy">
          <span className="welcome-kicker welcome-reveal">ТВОЯ ЦЕЛЬ. ТВОЁ ПРИКЛЮЧЕНИЕ.</span>
          <h1 className="welcome-reveal" style={{ '--delay': '70ms' } as React.CSSProperties}>
            Преврати любую мечту <em>в приключение!</em>
          </h1>
          <p className="welcome-description welcome-reveal" style={{ '--delay': '140ms' } as React.CSSProperties}>
            GoalQuest — AI-помощник, который превращает любые долгосрочные цели в игровые квесты. AI создаёт персональный план, помогает на каждом этапе, мотивирует наградами и сопровождает до достижения результата.
          </p>
          <div className="welcome-actions welcome-reveal" style={{ '--delay': '210ms' } as React.CSSProperties}>
            <Link href="/auth?mode=signup&entry=app" className="welcome-button welcome-button--primary">Начать <span>→</span></Link>
            <button type="button" className="welcome-button welcome-button--secondary" onClick={() => setIsIntroOpen(true)}>Узнать больше <span>▶</span></button>
          </div>
          <WelcomeFeatures />
        </div>

        <div className="welcome-mascot welcome-reveal" style={{ '--delay': '180ms' } as React.CSSProperties}>
          <span className="welcome-orbit welcome-orbit--one" />
          <span className="welcome-orbit welcome-orbit--two" />
          <span className="welcome-spark welcome-spark--one">✦</span>
          <span className="welcome-spark welcome-spark--two">✦</span>
          <div className="welcome-speech">Привет! Я Кью 👋<small>Готов к большому приключению?</small></div>
          <img src="/goalquest-eagle-v2.png" alt="Орлёнок Кью — твой AI-наставник" />
          <div className="welcome-xp"><span>⚡</span><div><b>+20 XP</b><small>за первый шаг</small></div></div>
        </div>
      </section>

      <p className="welcome-note welcome-reveal" style={{ '--delay': '620ms' } as React.CSSProperties}>
        <span>Более 1000</span> целей можно превратить в увлекательные квесты — от изучения английского языка до запуска собственного стартапа.
      </p>
      {isIntroOpen && <GoalQuestIntro onClose={() => setIsIntroOpen(false)} />}
    </main>
  );
}

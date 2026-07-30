import { useEffect, useState } from 'react';

const slides = [
  { icon: '✨', eyebrow: 'УМНЫЙ СТАРТ', title: 'Расскажи Кью о своей мечте', text: 'AI-наставник поймёт твою цель, сроки и интересы — и соберёт персональное приключение.' },
  { icon: '🗺️', eyebrow: 'ПОНЯТНЫЙ МАРШРУТ', title: 'Двигайся небольшими шагами', text: 'Большая цель превратится в главы, задания и ежедневные действия, которые не пугают.' },
  { icon: '🏆', eyebrow: 'МОТИВАЦИЯ', title: 'Замечай каждую победу', text: 'Получай XP, открывай уровни, награды и пополняй коллекцию за реальный прогресс.' },
  { icon: '🤝', eyebrow: 'ВМЕСТЕ ВЕСЕЛЕЕ', title: 'Зови друзей в команду', text: 'Поддерживайте друг друга, проходите челленджи и добирайтесь до финиша вместе.' },
];

type GoalQuestIntroProps = { onClose: () => void };

export function GoalQuestIntro({ onClose }: GoalQuestIntroProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="intro-backdrop" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="intro-dialog" role="dialog" aria-modal="true" aria-labelledby="intro-title">
        <button className="intro-close" type="button" onClick={onClose} aria-label="Закрыть презентацию">×</button>
        <div className="intro-visual" aria-hidden="true">
          <span className="intro-visual__glow" />
          <span className="intro-visual__icon">{slide.icon}</span>
          <img src="/goalquest-eagle-v2.png" alt="" />
        </div>
        <div className="intro-content" key={activeSlide}>
          <span className="intro-eyebrow">{slide.eyebrow}</span>
          <h2 id="intro-title">{slide.title}</h2>
          <p>{slide.text}</p>
          <div className="intro-dots" aria-label={`Слайд ${activeSlide + 1} из ${slides.length}`}>
            {slides.map((item, index) => (
              <button key={item.title} className={index === activeSlide ? 'is-active' : ''} onClick={() => setActiveSlide(index)} aria-label={`Открыть слайд ${index + 1}`} />
            ))}
          </div>
          <div className="intro-actions">
            {activeSlide > 0 && <button type="button" className="intro-back" onClick={() => setActiveSlide((value) => value - 1)}>Назад</button>}
            {activeSlide < slides.length - 1
              ? <button type="button" className="welcome-button welcome-button--primary" onClick={() => setActiveSlide((value) => value + 1)}>Дальше →</button>
              : <button type="button" className="welcome-button welcome-button--primary" onClick={onClose}>Готово ✓</button>}
          </div>
        </div>
      </section>
    </div>
  );
}

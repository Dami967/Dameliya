const features = [
  { icon: '🎯', title: 'Персональный AI-наставник', text: 'Подсказывает следующий шаг и поддерживает твой темп.' },
  { icon: '🗺️', title: 'Любая цель — пошаговый квест', text: 'Большая мечта становится понятным маршрутом с заданиями.' },
  { icon: '🏆', title: 'XP, уровни, награды и коллекции', text: 'Каждый выполненный шаг приносит заметный прогресс.' },
  { icon: '🤝', title: 'Друзья и челленджи', text: 'Соревнуйся с друзьями и празднуй победы вместе.' },
];

export function WelcomeFeatures() {
  return (
    <div className="welcome-features" aria-label="Преимущества GoalQuest">
      {features.map((feature, index) => (
        <article className="welcome-feature welcome-reveal" style={{ '--delay': `${index * 90 + 260}ms` } as React.CSSProperties} key={feature.title}>
          <span className="welcome-feature__icon" aria-hidden="true">{feature.icon}</span>
          <div>
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

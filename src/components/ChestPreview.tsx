import { useState } from 'react';

export function ChestPreview({ onClose }: { onClose: () => void }) {
  const [opened, setOpened] = useState(false);
  return <div className="chest-preview-backdrop" role="presentation" onClick={onClose}>
    <section className={`chest-preview ${opened ? 'is-opened' : ''}`} role="dialog" aria-modal="true"
      aria-label="Предпросмотр сундука" onClick={(event) => event.stopPropagation()}>
      <button className="chest-preview__close" onClick={onClose} aria-label="Закрыть">×</button>
      <small>РЕЖИМ СОЗДАТЕЛЯ · НАГРАДА НЕ СОХРАНЯЕТСЯ</small>
      <div className="chest-preview__chest">{opened ? '✨' : '🎁'}</div>
      <h1>{opened ? 'Сундук открыт!' : 'Обычный сундук готов'}</h1>
      <p>{opened ? 'Тест успешен: анимация и результат открытия работают.'
        : 'Нажми кнопку, чтобы проверить открытие без изменения своего прогресса.'}</p>
      {opened ? <div className="chest-preview__prize"><span>🧭</span><div><small>ТЕСТОВЫЙ ПРИЗ</small><b>Компас цели</b></div></div>
        : <button className="primary-button" onClick={() => setOpened(true)}>Открыть сундук</button>}
      {opened && <button className="secondary-button" onClick={() => setOpened(false)}>Проверить ещё раз</button>}
      {opened && <div className="chest-preview__sparkles" aria-hidden="true">✦　✧　✦　✧　✦</div>}
    </section>
  </div>;
}

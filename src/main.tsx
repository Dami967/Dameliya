import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AutomaticTranslation } from './components/AutomaticTranslation';
import { registerNotificationWorker } from './lib/browserNotifications';
import { detectLanguage } from './lib/languages';

void registerNotificationWorker();
const initialLanguage = detectLanguage();
document.documentElement.lang = initialLanguage;
if (initialLanguage !== 'ru') {
  const translationLabel = initialLanguage === 'kk' ? 'Тіл ауыстырылуда…' : 'Changing language…';
  document.documentElement.dataset.uiTranslating = 'true';
  document.body.dataset.uiTranslatingLabel = translationLabel;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><AutomaticTranslation><App /></AutomaticTranslation></AppErrorBoundary>
  </React.StrictMode>,
);

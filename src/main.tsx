import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AutomaticTranslation } from './components/AutomaticTranslation';
import { registerNotificationWorker } from './lib/browserNotifications';

void registerNotificationWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><AutomaticTranslation><App /></AutomaticTranslation></AppErrorBoundary>
  </React.StrictMode>,
);

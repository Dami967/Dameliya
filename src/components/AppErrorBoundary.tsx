import { Component, type ErrorInfo, type ReactNode } from 'react';

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; message: string }> {
  state = { failed: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { failed: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('GoalQuest interface failed', error, info);
  }

  render() {
    if (this.state.failed) return <main className="app-error">
      <span>🦅</span><h1>GoalQuest нужно обновить</h1>
      <p>Интерфейс не загрузился, но твои данные сохранены.</p>
      <div><button onClick={() => window.location.reload()}>Обновить страницу</button>
        <button className="app-error-home" onClick={() => { window.location.href = '/home'; }}>На главную</button></div>
      {this.state.message && <small>Ошибка: {this.state.message}</small>}
    </main>;
    return this.props.children;
  }
}

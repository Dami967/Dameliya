const updateInterval = 2 * 60 * 1000;

export function watchForAppUpdates() {
  const currentBundle = bundlePath(document);
  if (!currentBundle) return;

  let checking = false;
  async function check() {
    if (checking || document.visibilityState === 'hidden') return;
    checking = true;
    try {
      const response = await fetch(`/?update=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const latestDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
      const latestBundle = bundlePath(latestDocument);
      if (latestBundle && latestBundle !== currentBundle) loadFreshPage();
    } catch {
      // Проверка повторится при следующем фокусе или через две минуты.
    } finally {
      checking = false;
    }
  }

  const interval = window.setInterval(() => void check(), updateInterval);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', check);
  void check();

  return () => {
    window.clearInterval(interval);
    window.removeEventListener('focus', check);
    document.removeEventListener('visibilitychange', check);
  };
}

function loadFreshPage() {
  const freshUrl = new URL(window.location.href);
  freshUrl.searchParams.set('app-update', Date.now().toString());
  window.location.replace(freshUrl.toString());
}

function bundlePath(page: Document) {
  return page.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')?.src ?? '';
}

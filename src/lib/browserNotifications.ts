export async function registerNotificationWorker() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/goalquest-sw.js');
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported' as const;
  const permission = await Notification.requestPermission();
  if (permission === 'granted') await registerNotificationWorker();
  return permission;
}

export async function showBrowserNotification(title: string, body: string, path = '/home', tag = 'goalquest') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const registration = await registerNotificationWorker();
  if (registration) {
    await registration.showNotification(title, { body, tag, icon: '/goalquest-eagle.png',
      badge: '/goalquest-eagle.png', data: { path } });
  } else {
    const notification = new Notification(title, { body, tag });
    notification.onclick = () => { window.focus(); window.location.href = path; };
  }
  return true;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.path || '/home';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows[0];
    if (existing) { existing.navigate(path); return existing.focus(); }
    return clients.openWindow(path);
  }));
});

// Совместимость со старой установленной версией GoalQuest.
const recoveryKey = 'goalquest-module-recovery';
if (!sessionStorage.getItem(recoveryKey)) {
  sessionStorage.setItem(recoveryKey, '1');
  const freshUrl = new URL(window.location.href);
  freshUrl.searchParams.set('app-update', Date.now().toString());
  window.location.replace(freshUrl.toString());
}

// Совместимость со старыми установленными версиями GoalQuest.
const recoveryKey = 'goalquest-module-recovery';
let alreadyTried = false;
try {
  alreadyTried = sessionStorage.getItem(recoveryKey) === '1';
  sessionStorage.setItem(recoveryKey, '1');
} catch {
  // Safari может запретить storage, но обновление страницы всё равно сработает.
}
if (!alreadyTried) {
  const freshUrl = new URL(window.location.href);
  freshUrl.searchParams.set('app-update', Date.now().toString());
  window.location.replace(freshUrl.toString());
}

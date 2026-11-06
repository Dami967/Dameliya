export function isReminderTime(time: string, now = new Date()) {
  const [hour, minute] = time.split(':').map(Number);
  return now.getHours() === hour && now.getMinutes() === minute;
}

import { supabase } from './supabase';

export type HomeProgress = {
  streak: number;
  freezesUsed: number;
  freezesRemaining: number;
  weekCounts: number[];
  activeWeekdays: boolean[];
  growth: number | null;
  completedToday: number;
};

const emptyProgress: HomeProgress = {
  streak: 0, freezesUsed: 0, freezesRemaining: 5,
  weekCounts: Array(7).fill(0), activeWeekdays: Array(7).fill(false),
  growth: null, completedToday: 0,
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  return start;
}

export async function loadHomeProgress(userId: string): Promise<HomeProgress> {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const { data, error } = await supabase.from('quest_task_records').select('completed_at')
    .eq('user_id', userId).eq('status', 'done').not('completed_at', 'is', null)
    .order('completed_at', { ascending: false }).limit(5000);
  if (error || !data) return emptyProgress;

  const counts = new Map<string, number>();
  data.forEach(({ completed_at }) => {
    if (!completed_at) return;
    const key = dateKey(new Date(completed_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const weekCounts = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return counts.get(dateKey(day)) ?? 0;
  });
  const previousTotal = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(previousWeekStart);
    day.setDate(day.getDate() + index);
    return counts.get(dateKey(day)) ?? 0;
  }).reduce((sum, count) => sum + count, 0);
  const currentTotal = weekCounts.reduce((sum, count) => sum + count, 0);

  const { streak, freezesUsed } = calculateStreak(counts, today);
  return {
    streak,
    freezesUsed,
    freezesRemaining: Math.max(0, 5 - freezesUsed),
    weekCounts,
    activeWeekdays: weekCounts.map((count) => count > 0),
    growth: previousTotal ? Math.round((currentTotal - previousTotal) / previousTotal * 100) : null,
    completedToday: counts.get(dateKey(today)) ?? 0,
  };
}

function calculateStreak(counts: Map<string, number>, today: Date) {
  if (!counts.size) return { streak: 0, freezesUsed: 0 };
  const activeDates = [...counts.keys()].map(parseDateKey).sort((a, b) => a.getTime() - b.getTime());
  const firstActivity = activeDates[0];
  const yesterday = dayStart(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const protectedDays = new Set<string>();
  const missedByMonth = new Map<string, number>();
  const day = dayStart(firstActivity);
  while (day <= yesterday) {
    const key = dateKey(day);
    if (!counts.has(key)) {
      const month = monthKey(day);
      const missed = (missedByMonth.get(month) ?? 0) + 1;
      missedByMonth.set(month, missed);
      if (missed <= 5) protectedDays.add(key);
    }
    day.setDate(day.getDate() + 1);
  }

  let streak = 0;
  const cursor = dayStart(today);
  if (!counts.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (cursor >= firstActivity) {
    const key = dateKey(cursor);
    if (counts.has(key)) streak += 1;
    else if (!protectedDays.has(key)) break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, freezesUsed: Math.min(5, missedByMonth.get(monthKey(today)) ?? 0) };
}

function dayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month, day);
}

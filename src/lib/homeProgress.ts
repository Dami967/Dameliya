import { supabase } from './supabase';

export type HomeProgress = {
  streak: number;
  weekCounts: number[];
  activeWeekdays: boolean[];
  growth: number | null;
  completedToday: number;
};

const emptyProgress: HomeProgress = {
  streak: 0, weekCounts: Array(7).fill(0), activeWeekdays: Array(7).fill(false),
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

  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!counts.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (counts.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return {
    streak,
    weekCounts,
    activeWeekdays: weekCounts.map((count) => count > 0),
    growth: previousTotal ? Math.round((currentTotal - previousTotal) / previousTotal * 100) : null,
    completedToday: counts.get(dateKey(today)) ?? 0,
  };
}

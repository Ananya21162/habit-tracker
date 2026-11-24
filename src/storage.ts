import AsyncStorage from '@react-native-async-storage/async-storage';

export type Habit = { id: string; name: string; addedOnDay: number };

export type Challenge = {
  owner?: string;
  name: string;
  totalDays: number;
  startDate: string; // YYYY-MM-DD, local time
  habits: Habit[];
  log: Record<string, string[]>; // day number -> ids of habits done that day
  notes?: Record<string, string>; // day number -> intention journal entry
};

const KEY = 'challenge-v2';
const V1_KEY = 'challenge-v1';

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function loadChallenge(): Promise<Challenge | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) return JSON.parse(raw) as Challenge;

  const v1 = await AsyncStorage.getItem(V1_KEY);
  if (!v1) return null;
  const old = JSON.parse(v1) as {
    name: string;
    totalDays: number;
    startDate: string;
    completed: number[];
  };
  const id = newId();
  const migrated: Challenge = {
    name: old.name,
    totalDays: old.totalDays,
    startDate: old.startDate,
    habits: [{ id, name: old.name, addedOnDay: 1 }],
    log: Object.fromEntries(old.completed.map((d) => [String(d), [id]])),
  };
  await saveChallenge(migrated);
  return migrated;
}

export async function saveChallenge(c: Challenge): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(c));
}

export async function clearChallenge(): Promise<void> {
  await AsyncStorage.multiRemove([KEY, V1_KEY]);
}

export function todayString(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function toUtcDays(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function currentDay(c: Challenge): number {
  return toUtcDays(todayString()) - toUtcDays(c.startDate) + 1;
}

export function activeHabits(c: Challenge, day: number): Habit[] {
  return c.habits.filter((h) => h.addedOnDay <= day);
}

export function isDone(c: Challenge, day: number, habitId: string): boolean {
  return (c.log[String(day)] ?? []).includes(habitId);
}

export type DayStatus = 'full' | 'partial' | 'none';

export function dayStatus(c: Challenge, day: number): DayStatus {
  const active = activeHabits(c, day);
  const done = active.filter((h) => isDone(c, day, h.id)).length;
  if (active.length > 0 && done === active.length) return 'full';
  return done > 0 ? 'partial' : 'none';
}

export function toggleHabit(c: Challenge, day: number, habitId: string): Challenge {
  const key = String(day);
  const current = c.log[key] ?? [];
  const next = current.includes(habitId)
    ? current.filter((id) => id !== habitId)
    : [...current, habitId];
  return { ...c, log: { ...c.log, [key]: next } };
}

function streakEndingAt(today: number, ok: (day: number) => boolean, from = 1): number {
  let day = ok(today) ? today : today - 1;
  let streak = 0;
  while (day >= from && ok(day)) {
    streak++;
    day--;
  }
  return streak;
}

export function todayClamped(c: Challenge): number {
  return Math.max(1, Math.min(currentDay(c), c.totalDays));
}

export function overallStreak(c: Challenge): number {
  return streakEndingAt(todayClamped(c), (d) => dayStatus(c, d) === 'full');
}

export function habitStreak(c: Challenge, habit: Habit): number {
  return streakEndingAt(
    todayClamped(c),
    (d) => isDone(c, d, habit.id),
    habit.addedOnDay,
  );
}

export function fullDaysCount(c: Challenge): number {
  let n = 0;
  for (let d = 1; d <= todayClamped(c); d++) {
    if (dayStatus(c, d) === 'full') n++;
  }
  return n;
}

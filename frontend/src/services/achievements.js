import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACHIEVEMENT_DEFS,
  ACHIEVEMENTS_STORAGE_KEY,
  ACTIVITY_DATES_KEY,
} from '../constants/achievements';

/** Rough hours from duration strings like "12 hours", "40h", "2 weeks" */
export function estimateHoursFromCompletions(completions = []) {
  let total = 0;
  for (const c of completions) {
    const d = (c.duration || '').toLowerCase();
    const num = parseFloat(d.replace(/[^\d.]/g, '')) || 0;
    if (d.includes('week')) total += num * 10;
    else if (d.includes('month')) total += num * 40;
    else if (d.includes('hour') || d.includes('hr') || d.endsWith('h')) total += num;
    else if (num > 0) total += Math.min(num, 80);
    else total += 8;
  }
  return Math.round(total);
}

export function countCertificates(completions = []) {
  return completions.filter(
    (c) =>
      (c.certificateUrl && String(c.certificateUrl).trim()) ||
      (typeof c.certificate === 'string' && c.certificate.trim())
  ).length;
}

/** Consecutive calendar days ending today (UTC date strings YYYY-MM-DD) */
export function computeStreakFromDates(dates = []) {
  const set = new Set(dates);
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (set.has(key)) streak += 1;
    else if (i > 0) break;
  }
  return streak;
}

export async function recordActivityDay(userId) {
  if (!userId) return;
  const key = ACTIVITY_DATES_KEY(userId);
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = await AsyncStorage.getItem(key);
    let arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) arr = [];
    if (!arr.includes(today)) {
      arr.push(today);
      arr = arr.slice(-120);
      await AsyncStorage.setItem(key, JSON.stringify(arr));
    }
  } catch (e) {
    console.warn('recordActivityDay', e);
  }
}

export async function getActivityDates(userId) {
  try {
    const raw = await AsyncStorage.getItem(ACTIVITY_DATES_KEY(userId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Merge newly earned achievements into persisted store.
 * @returns {{ unlocked: string[], newlyUnlocked: string[], progress: Record<string, number> }}
 */
export async function syncAchievements(userId, completions = []) {
  if (!userId) return { unlocked: [], newlyUnlocked: [], progress: {} };

  const courseCount = completions.length;
  const certCount = countCertificates(completions);
  const hours = estimateHoursFromCompletions(completions);
  const dates = await getActivityDates(userId);
  const streak = computeStreakFromDates(dates);

  const storageKey = ACHIEVEMENTS_STORAGE_KEY(userId);
  let prev = [];
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    prev = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(prev)) prev = [];
  } catch {
    prev = [];
  }

  const prevSet = new Set(prev);
  const newlyUnlocked = [];
  const progress = {};

  const earnedFor = (def) => {
    const { type, min } = def.rule;
    if (type === 'courses') return courseCount >= min;
    if (type === 'certificates') return certCount >= min;
    if (type === 'hours') return hours >= min;
    if (type === 'streak') return streak >= min;
    return false;
  };

  for (const def of ACHIEVEMENT_DEFS) {
    const { type, min } = def.rule;
    let pct = 0;
    if (type === 'courses') pct = Math.min(100, (courseCount / min) * 100);
    else if (type === 'certificates') pct = Math.min(100, (certCount / min) * 100);
    else if (type === 'hours') pct = Math.min(100, (hours / min) * 100);
    else if (type === 'streak') pct = Math.min(100, (streak / min) * 100);
    progress[def.id] = pct;

    const earned = earnedFor(def);
    if (earned && !prevSet.has(def.id)) {
      newlyUnlocked.push(def.id);
      prevSet.add(def.id);
    }
  }

  const unlocked = [...prevSet];
  await AsyncStorage.setItem(storageKey, JSON.stringify(unlocked));

  return { unlocked, newlyUnlocked, progress };
}

export function getAchievementMeta(id) {
  return ACHIEVEMENT_DEFS.find((a) => a.id === id);
}

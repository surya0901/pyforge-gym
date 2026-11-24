import type { CardState, CompanyId, Exercise, PatternId, Progress } from '../types';

const KEY = 'pyforge.progress.v1';
const DAY = 86_400_000;

export const emptyProgress = (): Progress => ({ cards: {}, days: [], mistakes: {}, math: [] });

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw) as Partial<Progress>;
    return { cards: p.cards ?? {}, days: p.days ?? [], mistakes: p.mistakes ?? {}, math: p.math ?? [], savedAt: p.savedAt ?? 0, lessons: p.lessons ?? {} };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full or blocked — progress stays in memory */
  }
}

export function updateLesson(p: Progress, id: string, patch: (s: import('../types').LessonState) => import('../types').LessonState): Progress {
  const lessons = { ...(p.lessons ?? {}) };
  lessons[id] = patch({ ...(lessons[id] ?? {}) });
  const d = today();
  return { ...p, lessons, days: p.days.includes(d) ? p.days : [...p.days, d], savedAt: Date.now() };
}

export const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

/**
 * SM-2-lite. quality: 0 = fail, 1 = hard (partial / slow), 2 = good, 3 = easy.
 */
export function review(p: Progress, id: string, quality: 0 | 1 | 2 | 3, tags: string[] = []): Progress {
  const now = Date.now();
  const prev: CardState = p.cards[id] ?? { reps: 0, ease: 2.5, interval: 0, due: now, attempts: 0, correct: 0, lastResult: null, lastSeen: 0 };
  const c = { ...prev, attempts: prev.attempts + 1, lastSeen: now };
  if (quality === 0) {
    c.reps = 0;
    c.interval = 0;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.due = now + 10 * 60_000; // retry in 10 min
    c.lastResult = false;
  } else {
    c.correct += 1;
    c.reps += 1;
    c.ease = Math.max(1.3, c.ease + (quality === 3 ? 0.15 : quality === 1 ? -0.15 : 0));
    c.interval = c.reps === 1 ? 1 : c.reps === 2 ? 3 : Math.round(c.interval * c.ease);
    if (quality === 1) c.interval = Math.max(1, Math.round(c.interval * 0.6));
    c.due = now + c.interval * DAY;
    c.lastResult = true;
  }
  const mistakes = { ...p.mistakes };
  for (const t of tags) mistakes[t] = (mistakes[t] ?? 0) + 1;
  const d = today();
  const days = p.days.includes(d) ? p.days : [...p.days, d].slice(-400);
  return { ...p, cards: { ...p.cards, [id]: c }, days, mistakes, savedAt: Date.now() };
}

/** 0..1 mastery for one card. */
export function mastery(c?: CardState): number {
  if (!c || c.attempts === 0) return 0;
  const acc = c.correct / c.attempts;
  const depth = Math.min(1, c.reps / 3);
  return Math.min(1, 0.4 * acc + 0.6 * depth) * (c.lastResult === false ? 0.6 : 1);
}

export function streak(days: string[]): number {
  const set = new Set(days);
  let n = 0;
  const d = new Date();
  if (!set.has(d.toLocaleDateString('en-CA'))) d.setDate(d.getDate() - 1); // today not done yet is fine
  while (set.has(d.toLocaleDateString('en-CA'))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Order: due reviews (most overdue first) → never seen → lowest mastery. */
export function buildQueue<T extends Exercise>(items: T[], p: Progress): T[] {
  const now = Date.now();
  const due: T[] = [], fresh: T[] = [], rest: T[] = [];
  for (const it of items) {
    const c = p.cards[it.id];
    if (!c) fresh.push(it);
    else if (c.due <= now) due.push(it);
    else rest.push(it);
  }
  due.sort((a, b) => p.cards[a.id].due - p.cards[b.id].due);
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  rest.sort((a, b) => mastery(p.cards[a.id]) - mastery(p.cards[b.id]) || p.cards[a.id].due - p.cards[b.id].due);
  return [...due, ...fresh, ...rest];
}

export function filterItems<T extends Exercise>(items: T[], pattern: PatternId | 'all', company: CompanyId | 'all'): T[] {
  return items.filter((e) => (pattern === 'all' || e.pattern === pattern) && (company === 'all' || e.companies.includes(company)));
}

export function averageMastery(items: Exercise[], p: Progress): number {
  if (!items.length) return 0;
  return items.reduce((s, e) => s + mastery(p.cards[e.id]), 0) / items.length;
}

export function logMath(p: Progress, score: number): Progress {
  const d = today();
  const days = p.days.includes(d) ? p.days : [...p.days, d].slice(-400);
  return { ...p, days, math: [...p.math, { at: Date.now(), score }].slice(-200), savedAt: Date.now() };
}

/** Small typed localStorage helpers for side data (stories, notes, settings). */
export function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function setLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

import { LESSONS, LESSON_FOR_PATTERN, type Lesson } from '../data/lessons';
import { BANKS } from '../data/companyBank';
import { NEETCODE } from '../data/neetcode';
import { COMPANIES } from '../data/meta';
import type { CompanyId, Progress } from '../types';

const NC = Object.fromEntries(NEETCODE.map((p) => [p.slug, p]));

/** Which lesson a NeetCode problem belongs to. */
export function lessonForSlug(slug: string): string | undefined {
  const direct = LESSONS.find((l) => l.problems.includes(slug));
  if (direct) return direct.id;
  const p = NC[slug];
  return p ? LESSON_FOR_PATTERN[p.pattern] : undefined;
}

export interface LessonCoverage { score: number; opened: boolean; checksRight: number; checksTotal: number; solved: number; total: number; learned: boolean }

/** 20% opened, 30% quick checks right, 50% practice problems solved. "Learned" also needs half the problems. */
export function lessonCoverage(l: Lesson, p: Progress, solved: Set<string>): LessonCoverage {
  const s = p.lessons?.[l.id] ?? {};
  const checksRight = l.check.filter((_, i) => s.checks?.[i]).length;
  const solvedN = l.problems.filter((x) => solved.has(x)).length;
  const score = (s.opened ? 0.2 : 0) + 0.3 * (checksRight / l.check.length) + 0.5 * (solvedN / l.problems.length);
  return { score, opened: !!s.opened, checksRight, checksTotal: l.check.length, solved: solvedN, total: l.problems.length, learned: score >= 0.75 };
}

export function patternsSummary(p: Progress, solved: Set<string>) {
  const rows = LESSONS.map((l) => ({ lesson: l, cov: lessonCoverage(l, p, solved) }));
  return { rows, learned: rows.filter((r) => r.cov.learned).length, started: rows.filter((r) => r.cov.score > 0).length, avg: rows.reduce((a, r) => a + r.cov.score, 0) / rows.length };
}

/** Companies that list the same problem (by NeetCode slug, else by name). */
export function sharedWith(q: { name: string; nc?: string }, except: CompanyId): CompanyId[] {
  return BANKS.filter((b) => b.id !== except && b.coding.some((c) => (q.nc && c.nc === q.nc) || c.name.toLowerCase() === q.name.toLowerCase())).map((b) => b.id);
}

export interface CompanyCoverage {
  id: CompanyId;
  coding: { done: number; total: number };
  lessons: { id: string; name: string; score: number }[];
  patternScore: number;
  overall: number;
  overlap: { id: CompanyId; shared: number }[];
}

export function companyCoverage(id: CompanyId, p: Progress, solved: Set<string>, readiness: number): CompanyCoverage {
  const bank = BANKS.find((b) => b.id === id)!;
  const nc = bank.coding.filter((q) => q.nc);
  const done = nc.filter((q) => solved.has(q.nc!)).length;
  const lessonIds = [...new Set(nc.map((q) => lessonForSlug(q.nc!)).filter(Boolean) as string[])];
  const lessons = lessonIds.map((lid) => {
    const l = LESSONS.find((x) => x.id === lid)!;
    return { id: lid, name: l.name, score: lessonCoverage(l, p, solved).score };
  });
  const patternScore = lessons.length ? lessons.reduce((a, l) => a + l.score, 0) / lessons.length : 0;
  const codingFrac = nc.length ? done / nc.length : 0;
  const overall = 0.4 * codingFrac + 0.35 * patternScore + 0.25 * readiness;
  const overlap = COMPANIES.filter((c) => c.id !== id).map((c) => {
    const other = BANKS.find((b) => b.id === c.id)!;
    const shared = bank.coding.filter((q) => other.coding.some((o) => (q.nc && o.nc === q.nc) || o.name.toLowerCase() === q.name.toLowerCase())).length;
    return { id: c.id, shared };
  }).filter((o) => o.shared > 0).sort((a, b) => b.shared - a.shared);
  return { id, coding: { done, total: nc.length }, lessons, patternScore, overall, overlap };
}

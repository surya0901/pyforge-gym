/**
 * One number per company: how prepared you are for its interview loop.
 * Used on Today, Companies and Stats so they always agree.
 */
import { PATTERN_DRILLS } from '../data';
import { COMPANIES } from '../data/meta';
import type { CompanyId, Mode, Progress } from '../types';
import { areaStats, readiness } from './coach';
import { companyCoverage } from './coverage';
import { getLocal, mastery, setLocal, today } from './storage';

export interface PrepPart { key: string; label: string; weight: number; value: number; detail: string; action: string; mode: Mode }
export interface Prep { id: CompanyId; overall: number; parts: PrepPart[]; next: PrepPart; level: string }

const HISTORY = 'pyforge.prepHistory';

export function prepLevel(x: number) {
  return x >= 0.8 ? 'Interview ready' : x >= 0.6 ? 'Almost there' : x >= 0.35 ? 'Building' : x >= 0.1 ? 'Getting started' : 'Not started';
}

export function companyPrep(id: CompanyId, p: Progress, solved: Set<string>, stats = areaStats(p)): Prep {
  const r = readiness(id, stats);
  const cov = companyCoverage(id, p, solved, r.score);
  const finderItems = PATTERN_DRILLS.filter((e) => e.companies.includes(id));
  const finderSeen = finderItems.filter((e) => p.cards[e.id]?.attempts).length;
  const finder = finderItems.length ? finderItems.reduce((a, e) => a + mastery(p.cards[e.id]), 0) / finderItems.length : 0;
  const oaHist = getLocal<{ at: number; problems: { passed: number; total: number }[] }[]>('pyforge.oa.history', []);
  const recent = oaHist.filter((h) => h.at > Date.now() - 21 * 86_400_000);
  const oaPct = recent.length ? recent.reduce((a, h) => a + h.problems.reduce((x, q) => x + q.passed / q.total, 0) / Math.max(1, h.problems.length), 0) / recent.length : 0;
  const oa = Math.min(1, recent.length / 4) * (0.4 + 0.6 * oaPct);
  const learned = cov.lessons.filter((l) => l.score >= 0.6).length;

  const parts: PrepPart[] = [
    { key: 'neetcode', label: 'Their NeetCode problems', weight: 0.35, value: cov.coding.total ? cov.coding.done / cov.coding.total : 0, detail: `${cov.coding.done} of ${cov.coding.total} solved`, action: 'Solve their next NeetCode problem', mode: 'companies' },
    { key: 'patterns', label: 'Patterns they ask', weight: 0.2, value: cov.patternScore, detail: `${learned} of ${cov.lessons.length} patterns learned`, action: 'Learn the next pattern they ask', mode: 'learn' },
    { key: 'finder', label: 'Spotting the pattern', weight: 0.15, value: finder, detail: `${finderSeen} of ${finderItems.length} of their problems tried in Pattern finder`, action: 'Pattern finder on their problems', mode: 'pattern' },
    { key: 'skills', label: 'Skills their loop tests', weight: 0.2, value: r.score, detail: 'Syntax, debugging, math and other rounds, weighted the way they interview', action: 'Practice their weakest round', mode: 'companies' },
    { key: 'oa', label: 'Timed online assessments', weight: 0.1, value: oa, detail: `${recent.length} mock OA${recent.length === 1 ? '' : 's'} in the last 3 weeks`, action: 'Take a timed mock OA', mode: 'oa' },
  ];
  const overall = parts.reduce((a, x) => a + x.weight * x.value, 0);
  const next = [...parts].sort((a, b) => b.weight * (1 - b.value) - a.weight * (1 - a.value))[0];
  return { id, overall, parts, next, level: prepLevel(overall) };
}

export function allPrep(p: Progress, solved: Set<string>) {
  const stats = areaStats(p);
  return Object.fromEntries(COMPANIES.map((c) => [c.id, companyPrep(c.id, p, solved, stats)])) as Record<CompanyId, Prep>;
}

/** Records today's numbers once per day and returns the change over the last 7 days. */
export function trackPrep(prep: Record<CompanyId, Prep>) {
  const hist = getLocal<Record<string, Record<string, number>>>(HISTORY, {});
  const d = today();
  hist[d] = Object.fromEntries(Object.values(prep).map((x) => [x.id, Math.round(x.overall * 1000) / 1000]));
  const days = Object.keys(hist).sort();
  for (const old of days.slice(0, Math.max(0, days.length - 90))) delete hist[old];
  setLocal(HISTORY, hist);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toLocaleDateString('en-CA');
  const base = days.filter((x) => x <= weekAgo).pop() ?? days[0];
  const since = base && base !== d ? hist[base] : undefined;
  return { since: base, delta: (id: CompanyId) => (since && since[id] != null ? (prep[id].overall - since[id]) : null) };
}

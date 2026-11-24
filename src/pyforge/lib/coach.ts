import { ALL } from '../data';
import { AREA_NAME, PLAYBOOKS, type Area } from '../data/companies';
import { DESIGN_PROBLEMS } from '../data/design';
import { FLASHCARDS } from '../data/flashcards';
import type { CompanyId, Mode, Progress } from '../types';
import { mastery } from './storage';
import { firstTryRate, practicalMastery, totalParts } from './practical';

export interface AreaStat { area: Area; name: string; items: number; seen: number; attempts: number; accuracy: number; mastery: number }

const DECK_AREA: Record<string, Area> = { behavioral: 'behavioral', fundamentals: 'fundamentals', 'cpp-systems': 'fundamentals', python: 'python', design: 'design', quant: 'quant', 'gpu-ai': 'gpu-ai' };

export const AREA_MODE: Record<Area, Mode> = {
  syntax: 'syntax', bugs: 'bug', patterns: 'pattern', practical: 'practical', design: 'design',
  behavioral: 'cards', fundamentals: 'cards', python: 'cards', quant: 'cards', 'gpu-ai': 'cards',
};
export const AREA_DECK: Partial<Record<Area, string>> = { behavioral: 'behavioral', fundamentals: 'fundamentals', python: 'python', quant: 'quant', 'gpu-ai': 'gpu-ai' };

/** Every trackable item id grouped by area. */
function itemsByArea(): Record<Area, string[]> {
  const out = Object.fromEntries(Object.keys(AREA_NAME).map((a) => [a, [] as string[]])) as Record<Area, string[]>;
  for (const e of ALL) out[e.kind === 'syntax' ? 'syntax' : e.kind === 'bug' ? 'bugs' : 'patterns'].push(e.id);
  for (const f of FLASHCARDS) out[DECK_AREA[f.deck]].push(f.id);
  for (const d of DESIGN_PROBLEMS) out.design.push(d.id);
  return out;
}
const BY_AREA = itemsByArea();

export function areaStats(p: Progress): AreaStat[] {
  return (Object.keys(AREA_NAME) as Area[]).map((area) => {
    if (area === 'practical') {
      const ft = firstTryRate();
      return { area, name: AREA_NAME[area], items: totalParts(), seen: ft.passed, attempts: ft.passed, accuracy: ft.passed ? ft.clean / ft.passed : 0, mastery: practicalMastery() };
    }
    const ids = BY_AREA[area];
    let attempts = 0, correct = 0, seen = 0, mast = 0;
    for (const id of ids) {
      const c = p.cards[id];
      if (c) { seen++; attempts += c.attempts; correct += c.correct; }
      mast += mastery(c);
    }
    return { area, name: AREA_NAME[area], items: ids.length, seen, attempts, accuracy: attempts ? correct / attempts : 0, mastery: ids.length ? mast / ids.length : 0 };
  });
}

export function readiness(company: CompanyId, stats: AreaStat[]): { score: number; parts: { area: Area; weight: number; mastery: number }[] } {
  const pb = PLAYBOOKS.find((x) => x.id === company)!;
  const parts = (Object.entries(pb.weights) as [Area, number][]).map(([area, weight]) => ({ area, weight, mastery: stats.find((s) => s.area === area)?.mastery ?? 0 }));
  const total = parts.reduce((s, x) => s + x.weight, 0);
  return { score: parts.reduce((s, x) => s + x.weight * x.mastery, 0) / total, parts: parts.sort((a, b) => b.weight - a.weight) };
}

export interface PlanItem { area: Area; title: string; why: string; minutes: number; mode: Mode; deck?: string }

/**
 * Builds today's plan for the chosen target companies.
 * Priority = how much the targets weigh an area × how far you are from mastering it,
 * with a boost for areas where your accuracy is actually low (not just unpracticed).
 */
export function buildPlan(p: Progress, targets: CompanyId[]): { plan: PlanItem[]; strengths: AreaStat[]; gaps: AreaStat[]; dueCards: number } {
  const stats = areaStats(p);
  const tgt = targets.length ? targets : PLAYBOOKS.map((x) => x.id);
  const weight: Partial<Record<Area, number>> = {};
  for (const id of tgt) {
    const pb = PLAYBOOKS.find((x) => x.id === id)!;
    for (const [a, w] of Object.entries(pb.weights) as [Area, number][]) weight[a] = (weight[a] ?? 0) + w / tgt.length;
  }
  const scored = stats
    .filter((s) => (weight[s.area] ?? 0) > 0)
    .map((s) => {
      const lowAcc = s.attempts >= 3 && s.accuracy < 0.6 ? 0.5 : 0;
      return { s, score: (weight[s.area] ?? 0) * (1 - s.mastery + lowAcc) };
    })
    .sort((a, b) => b.score - a.score);

  const now = Date.now();
  const dueCards = Object.entries(p.cards).filter(([id, c]) => id.startsWith('fc-') && c.due <= now).length;

  const plan: PlanItem[] = [];
  if (dueCards >= 3) plan.push({ area: 'behavioral', title: `Review ${dueCards} flashcards due today`, why: 'Spaced repetition only works if reviews happen on time.', minutes: Math.min(10, Math.ceil(dueCards / 2)), mode: 'cards', deck: 'due' });
  for (const { s } of scored) {
    if (plan.length >= 3) break;
    const untouched = s.attempts === 0;
    const low = s.attempts >= 3 && s.accuracy < 0.6;
    const why = untouched
      ? `Your targets weigh this heavily and you have not started it.`
      : low
        ? `Accuracy is ${Math.round(s.accuracy * 100)}% over ${s.attempts} tries. This is a real gap, not just missing practice.`
        : `${s.seen} of ${s.items} seen, mastery ${Math.round(s.mastery * 100)}%. Build depth here next.`;
    const minutes = s.area === 'design' ? 15 : s.area === 'practical' ? 30 : 8;
    plan.push({ area: s.area, title: untouched ? `Start: ${s.name}` : `Practice: ${s.name}`, why, minutes, mode: AREA_MODE[s.area], deck: AREA_DECK[s.area] });
  }

  const strengths = stats.filter((s) => s.attempts >= 5 && s.accuracy >= 0.75).sort((a, b) => b.accuracy - a.accuracy);
  const gaps = stats.filter((s) => s.attempts >= 3 && s.accuracy < 0.6).sort((a, b) => a.accuracy - b.accuracy);
  return { plan, strengths, gaps, dueCards };
}

/** A self-contained prompt the user can paste into Claude for a deeper review. */
export function claudePrompt(p: Progress, targetNames: string[], mistakes: [string, number][]): string {
  const stats = areaStats(p);
  const names = targetNames.length ? targetNames.join(', ') : 'Citadel, HRT, Jane Street, Meta, Microsoft, Amazon, Google, Netflix, Apple, Nvidia, OpenAI';
  const lines = stats.map((s) => `- ${s.name}: ${s.seen}/${s.items} seen, ${s.attempts} attempts, accuracy ${Math.round(s.accuracy * 100)}%, mastery ${Math.round(s.mastery * 100)}%`);
  const slips = mistakes.length ? mistakes.map(([t, n]) => `- ${t} ×${n}`).join('\n') : '- none logged yet';
  return `I'm preparing for new grad software engineer interviews at ${names}. Here are my practice stats from my study app:

${lines.join('\n')}

My most frequent mistakes:
${slips}

Please:
1. Tell me honestly where I'm strongest and weakest for these companies.
2. Give me a 2-week plan that fits into short breaks (10–20 minutes) plus a longer weekend session.
3. Quiz me now with 3 questions targeting my weakest area, one at a time, and wait for my answer.`;
}

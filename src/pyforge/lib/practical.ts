/** Progress for Practical rounds (multi-part class design + codebase rounds). Plain functions, no React. */
import { CODEBASES, PRACTICAL } from '../data/practical';
import { getLocal, setLocal, today } from './storage';

export interface PartLog { passedAt?: number; submits: number; runs: number; firstTry?: boolean; ms?: number; approach?: string; edges?: string }
export interface RoundLog { code?: string; files?: Record<string, string>; startedAt?: number; parts: PartLog[]; solutionSeen?: boolean; review?: string; aiAsks?: number; days?: string[] }
type Store = Record<string, RoundLog>;
const KEY = 'pyforge.practical';

export const practicalStore = (): Store => getLocal<Store>(KEY, {});
export function saveRound(id: string, r: RoundLog) {
  const s = practicalStore();
  s[id] = { ...r, days: [...new Set([...(r.days ?? []), today()])].slice(-60) };
  setLocal(KEY, s);
}
export const emptyRound = (n: number): RoundLog => ({ parts: Array.from({ length: n }, () => ({ submits: 0, runs: 0 })) });

export const totalParts = () => PRACTICAL.reduce((a, p) => a + p.parts.length, 0) + CODEBASES.reduce((a, c) => a + c.phases.length, 0);

/** Share of all parts passed, with first-try clean passes worth full credit and the rest 70%. */
export function practicalMastery(): number {
  const s = practicalStore();
  let got = 0;
  for (const r of Object.values(s)) for (const p of r.parts) if (p.passedAt) got += p.firstTry ? 1 : 0.7;
  return Math.min(1, got / totalParts());
}

export function firstTryRate(): { passed: number; clean: number } {
  let passed = 0, clean = 0;
  for (const r of Object.values(practicalStore())) for (const p of r.parts) if (p.passedAt) { passed++; if (p.firstTry) clean++; }
  return { passed, clean };
}

/** Parts passed today, for the daily checklist. */
export function practicalPartsToday(): number {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  let n = 0;
  for (const r of Object.values(practicalStore())) for (const p of r.parts) if (p.passedAt && p.passedAt >= start.getTime()) n++;
  return n;
}

/** The round to work on next: an unfinished one you started, else the next untouched one, alternating with codebase rounds. */
export function nextRound(): { id: string; title: string; kind: 'practical' | 'codebase'; partIndex: number } {
  const s = practicalStore();
  const all = [
    ...PRACTICAL.map((p) => ({ id: p.id, title: p.title, kind: 'practical' as const, n: p.parts.length })),
    ...CODEBASES.map((c) => ({ id: c.id, title: c.title, kind: 'codebase' as const, n: c.phases.length })),
  ];
  const passed = (id: string) => (s[id]?.parts ?? []).filter((p) => p.passedAt).length;
  const started = all.find((x) => passed(x.id) > 0 && passed(x.id) < x.n) ?? all.find((x) => s[x.id]?.startedAt && passed(x.id) < x.n);
  const doneCount = all.filter((x) => passed(x.id) >= x.n).length;
  // every third fresh round is a codebase round, so both formats get practice
  const fresh = all.filter((x) => !s[x.id]?.startedAt);
  const wantCodebase = doneCount % 3 === 2;
  const pick = started ?? fresh.find((x) => (x.kind === 'codebase') === wantCodebase) ?? fresh[0] ?? all.find((x) => passed(x.id) < x.n) ?? all[0];
  return { id: pick.id, title: pick.title, kind: pick.kind, partIndex: Math.min(passed(pick.id), pick.n - 1) };
}

/** Joins a multi-file project into one runnable module, and maps line numbers back to files. */
export function joinFiles(files: { name: string; code: string }[], harness: string) {
  const local = files.map((f) => f.name.replace(/\.py$/, ''));
  const out: string[] = [];
  const map: { file: string; line: number }[] = []; // index = joined line - 1
  for (const f of files) {
    f.code.split('\n').forEach((l, i) => {
      if (local.some((m) => l.startsWith(`from ${m} import`) || l.trim() === `import ${m}`)) return;
      out.push(l); map.push({ file: f.name, line: i + 1 });
    });
  }
  out.push('', ...harness.split('\n'));
  out.push('', 'def _pyforge_case(name):', '    return globals()[name]()');
  return { src: out.join('\n'), where: (line?: number) => (line && map[line - 1]) || undefined };
}

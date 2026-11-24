import { Check, CheckCircle2, ChevronLeft, Circle, EyeOff, Lightbulb, Play, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BLUEPRINTS, IDIOMS } from '../data/blueprints';
import { LESSONS } from '../data/lessons';
import { checkPerf, checkSteps, runTests, warmUp, type PerfResult, type RunResult, type StepCheck, type StepReport } from '../lib/pyrunner';
import type { SampleFn } from '../lib/cloud';
import { useSample } from './AI';
import { coachRun, OwnStepCard, PlanWriter, type PlanReview, type PlanStep } from './OwnPlan';
import { aiName } from '../lib/cloud';
import { logMistake, SLIP_KINDS, blueprintForWeakness } from '../lib/mistakes';
import { getLocal, setLocal, today } from '../lib/storage';
import { NEETCODE } from '../data/neetcode';
import type { Blueprint } from '../types';
import CodeEditor from './CodeEditor';
import { Button, Card, PageTitle } from './ui';

// localStorage keys
const STATUS = 'pyforge.blueprints'; // per problem: when it was passed with hints and when blind
const IDIOM_HINTS = 'pyforge.idiomHints'; // idiom id -> times a hint was needed for it
const LOG = 'pyforge.blueprint.log'; // passes, for the daily checklist
const MODE_KEY = 'pyforge.blueprint.mode'; // own plan or blueprint steps

export interface BpStatus { guided?: number; blind?: number; clean?: boolean; hints?: number }
type Level = 0 | 1 | 2 | 3;

const lessonName = (id: string) => LESSONS.find((l) => l.id === id)?.name ?? id;
const norm = (line: string) => line.replace(/#.*$/, '').replace(/\s+/g, ' ').trim();
const indent = (text: string, pad = '    ') => text.split('\n').map((l) => (l ? pad + l : l)).join('\n');

export const getStatus = () => getLocal<Record<string, BpStatus>>(STATUS, {});
export const getIdiomHints = () => getLocal<Record<string, number>>(IDIOM_HINTS, {});
export const blueprintLog = () => getLocal<{ at: number; id: string; blind: boolean }[]>(LOG, []);

function starter(p: Blueprint, blind: boolean) {
  if (blind) return `${p.signature}\n    \n`;
  return `${p.signature}\n${p.steps.map((s, i) => `    # Step ${i + 1}: ${s.text}`).join('\n')}\n`;
}

/** The next problem worth doing: unfinished guided first, then a blind pass you haven't done. */
export function nextBlueprint(preferPattern?: string): Blueprint {
  const st = getStatus();
  // Your most frequent logic mistake picks the problem that trains it.
  const weak = blueprintForWeakness();
  const wb = weak ? BLUEPRINTS.find((b) => b.id === weak) : undefined;
  if (wb && !st[wb.id]?.blind) return wb;
  const pool = BLUEPRINTS.filter((p) => !st[p.id]?.blind);
  return pool.find((p) => p.pattern === preferPattern && !st[p.id]?.guided)
    ?? pool.find((p) => !st[p.id]?.guided)
    ?? pool[0] ?? BLUEPRINTS[0];
}

// ───────────────────────── Common mistake checker ─────────────────────────
interface Lint { line?: number; msg: string }

/** Strip strings and comments so keyword checks don't fire inside them. */
const codeOnly = (l: string) => l.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""').replace(/#.*$/, '');

export function lint(code: string, p: Blueprint): Lint[] {
  const out: Lint[] = [];
  const lines = code.split('\n');
  const setVars = new Set<string>();
  lines.forEach((raw) => { const m = codeOnly(raw).match(/(\w+)\s*=\s*set\(/); if (m) setVars.add(m[1]); });
  lines.forEach((raw, i) => {
    const l = codeOnly(raw);
    const n = i + 1;
    if (raw.includes('____')) out.push({ line: n, msg: 'This line still has a ____ blank. Fill it in from the step hint.' });
    if (/\[\s*\[\s*\]\s*\]\s*\*/.test(l)) out.push({ line: n, msg: '[[]] * n makes n copies of the SAME list, so appending to one bucket appends to all of them. Use [[] for _ in range(n)].' });
    if (/\b(true|false)\b/.test(l)) out.push({ line: n, msg: 'Python capitalizes booleans: True and False.' });
    if (/\b(null|nil|undefined)\b/.test(l)) out.push({ line: n, msg: 'Python uses None for "no value".' });
    if (/^\s*(int|long|double|float|String|char|boolean|bool|var|let|const|auto)\s+\w+\s*=/.test(l)) out.push({ line: n, msg: `Python doesn't declare types. Write ${l.trim().replace(/^\w+\s+/, '')} instead.` });
    if (/\.push\(/.test(l)) out.push({ line: n, msg: 'Python lists use .append(), not .push().' });
    if (/\.length\b/.test(l)) out.push({ line: n, msg: 'Use len(x) for the length, not x.length.' });
    if (/&&|\|\|/.test(l)) out.push({ line: n, msg: 'Python spells these as and / or.' });
    if (/!\s*[a-zA-Z_(]/.test(l) && !/!=/.test(l)) out.push({ line: n, msg: 'Python uses not, not !.' });
    if (/\belse\s+if\b/.test(l)) out.push({ line: n, msg: 'Python spells else if as elif.' });
    if (/\w(\+\+|--)/.test(l)) out.push({ line: n, msg: 'Python has no ++ or --. Use x += 1.' });
    if (/=\s*[\w.[\]]+\.sort\(/.test(l)) out.push({ line: n, msg: '.sort() sorts in place and returns None. Call it on its own line, or use sorted(x) to get a new list.' });
    for (const v of setVars) if (new RegExp(`\\b${v}\\.append\\(`).test(l)) out.push({ line: n, msg: `${v} is a set. Sets use .add(), lists use .append().` });
    const t = l.trim();
    if (/^(def|if|elif|else|for|while|try|except|finally|class|with)\b/.test(t) && !t.includes(':') && !/[(\[{,\\]$/.test(t)) out.push({ line: n, msg: `A line starting with ${t.split(/\W/)[0]} has to end with a colon.` });
    if (/^(if|elif|while)\b[^=!<>]*[^=!<>]=[^=]/.test(t)) out.push({ line: n, msg: 'Use == to compare. A single = assigns.' });
  });
  // The function itself must keep the right name, or the tests can't find it.
  const fname = p.signature.match(/(?:def|class) (\w+)/)![1];
  if (!new RegExp(`(def|class) ${fname}\\b`).test(code)) out.push({ line: 1, msg: `Keep the name ${fname}. The tests call it by that name.` });
  return out;
}

const ident = (s: string) => new Set(s.match(/[A-Za-z_]\w*/g) ?? []);
function dist(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Turn a raw Python error into a hint aimed at the actual mistake. */
export function explainError(err: string, code: string, p: Blueprint): string | null {
  const name = err.match(/NameError: name '(\w+)' is not defined/);
  if (name) {
    const bad = name[1];
    const known = [...new Set([...ident(code), ...ident(p.solution), 'True', 'False', 'None'])].filter((w) => w !== bad);
    const best = known.map((w) => ({ w, d: w.toLowerCase() === bad.toLowerCase() ? 0 : dist(w, bad) })).sort((a, b) => a.d - b.d)[0];
    if (best && best.d <= 2) return `${bad} isn't defined. Did you mean ${best.w}?${best.w.toLowerCase() === bad.toLowerCase() ? ' Python names are case sensitive.' : ''}`;
    return `${bad} isn't defined yet. Check which step creates it, and that it's spelled the same everywhere.`;
  }
  const attr = err.match(/'(\w+)' object has no attribute '(\w+)'/);
  if (attr) {
    const [, type, a] = attr;
    const fix: Record<string, string> = { 'set.append': '.add()', 'list.add': '.append()', 'dict.append': 'd[key] = value', 'str.append': 'string concatenation (+) or a list', 'list.push': '.append()', 'list.length': 'len(x)', 'str.length': 'len(s)' };
    return `A ${type} has no .${a}.${fix[`${type}.${a}`] ? ` Use ${fix[`${type}.${a}`]} instead.` : ''}`;
  }
  if (/IndentationError|unindent/.test(err)) return 'Indentation is off. Each line inside the function starts with 4 spaces, and each block inside a loop or if adds 4 more. Code for a step goes under its comment at the same indent.';
  if (/IndexError/.test(err)) return 'An index went past the end. Check range() bounds: range(a, b) stops BEFORE b, and the last index is len(x) - 1.';
  if (/KeyError/.test(err)) return 'A dict key was read before it was set. Use d.get(key, 0), or a defaultdict.';
  if (/TypeError: unhashable type: 'list'/.test(err)) return 'Lists can\'t be dict keys or set items. Convert with tuple(...).';
  if (/'NoneType' object is not (iterable|subscriptable)/.test(err)) return 'Something returned None. Common causes: x = x.sort(), or a path through the function with no return.';
  if (/RecursionError/.test(err)) return 'The recursion never stops. The base case has to come first and catch the empty case.';
  return null;
}

// ───────────────────────── Page ─────────────────────────
export default function BlueprintBuilder({ initial }: { initial?: string }) {
  const [sel, setSel] = useState<string | undefined>(initial && BLUEPRINTS.some((b) => b.id === initial) ? initial : undefined);
  const [status, setStatus] = useState(getStatus);
  const [idiomFilter, setIdiomFilter] = useState<string>();
  useEffect(() => { warmUp().catch(() => {}); }, []);

  const p = BLUEPRINTS.find((b) => b.id === sel);
  if (p) return <Workbench key={p.id} p={p} onBack={() => { setSel(undefined); setStatus(getStatus()); }} onNext={(id) => { setStatus(getStatus()); setSel(id); }} />;

  const groups = LESSONS.map((l) => ({ l, list: BLUEPRINTS.filter((b) => b.pattern === l.id && (!idiomFilter || b.steps.some((s) => s.idioms.includes(idiomFilter)))) })).filter((g) => g.list.length);
  const blindCount = BLUEPRINTS.filter((b) => status[b.id]?.blind).length;
  const guidedCount = BLUEPRINTS.filter((b) => status[b.id]?.guided).length;

  return (
    <div className="max-w-5xl">
      <PageTitle sub="For when you know the logic but freeze on a blank editor. Each problem is broken into plain English steps. Type the code for each step, with hints that get more specific only when you ask. Then do it again with no blueprint.">Blueprint builder</PageTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_1.3fr]">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">How to practice</h3>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-300">
            <li>Read the steps. Type each one under its comment. Hints go from a nudge, to a fill in the blank, to the exact lines you type yourself.</li>
            <li>Run the tests. The checker explains the usual slips in plain English.</li>
            <li>Once it passes, do the blind pass: the same problem from just the function line.</li>
          </ol>
          <div className="mt-4 flex gap-6 border-t border-zinc-800 pt-3 text-sm">
            <span className="text-zinc-400"><span className="tnum font-semibold text-zinc-100">{guidedCount}</span>/{BLUEPRINTS.length} with blueprint</span>
            <span className="text-zinc-400"><span className="tnum font-semibold text-emerald-300">{blindCount}</span>/{BLUEPRINTS.length} blind</span>
          </div>
        </Card>
        <WeakIdioms onPick={(id) => setIdiomFilter(idiomFilter === id ? undefined : id)} active={idiomFilter} />
      </div>
      {(() => {
        const t = getLocal<{ picks?: string[] }>(`pyforge.daily.${today()}`, {}).picks ?? [];
        const list = t.map((sl) => ({ nc: NEETCODE.find((x) => x.slug === sl), bp: BLUEPRINTS.find((b) => b.nc === sl) })).filter((x) => x.nc);
        if (!list.length) return null;
        return (
          <Card className="mb-6 p-5">
            <h3 className="mb-2 font-semibold text-zinc-100">Today's NeetCode problems</h3>
            <ul className="space-y-1.5 text-[15px]">
              {list.map(({ nc, bp }) => (
                <li key={nc!.slug} className="flex flex-wrap items-center gap-x-3">
                  <span className="text-zinc-200">{nc!.name}</span>
                  {bp ? <button className="link text-sm" onClick={() => setSel(bp.id)}>Plan and code it</button> : <span className="text-xs text-zinc-500">no blueprint yet</span>}
                  <a className="link text-sm" href={nc!.url} target="_blank" rel="noreferrer">NeetCode</a>
                </li>
              ))}
            </ul>
          </Card>
        );
      })()}
      {idiomFilter && (
        <p className="mb-4 text-sm text-zinc-400">Showing problems that use <span className="text-zinc-100">{IDIOMS[idiomFilter]?.label}</span>. <button className="link" onClick={() => setIdiomFilter(undefined)}>Show all</button></p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {groups.map(({ l, list }) => (
          <div key={l.id}>
            <h3 className="mb-2 font-medium text-zinc-300">{l.name}</h3>
            <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800 bg-zinc-900">
              {list.map((b) => {
                const s = status[b.id];
                return (
                  <li key={b.id}>
                    <button onClick={() => setSel(b.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[15px] hover:bg-zinc-950/50">
                      {s?.blind ? <CheckCircle2 size={15} className="shrink-0 text-emerald-400" /> : s?.guided ? <CheckCircle2 size={15} className="shrink-0 text-amber-400" /> : <Circle size={15} className="shrink-0 text-zinc-600" />}
                      <span className="flex-1 text-zinc-200">{b.title}</span>
                      <span className="text-xs text-zinc-500">{s?.blind ? 'blind done' : s?.guided ? 'blind pass next' : ''}</span>
                      <span className={`text-xs ${b.difficulty === 'easy' ? 'text-emerald-400' : 'text-amber-400'}`}>{b.difficulty}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The Python phrases you've needed hints for most. Also shown on Stats and Syntax recall. */
export function WeakIdioms({ onPick, active, compact }: { onPick?: (id: string) => void; active?: string; compact?: boolean }) {
  const counts = getIdiomHints();
  const top = Object.entries(counts).filter(([id]) => IDIOMS[id]).sort((a, b) => b[1] - a[1]).slice(0, compact ? 4 : 6);
  const [shown, setShown] = useState<string>();
  return (
    <Card className="p-5">
      <h3 className="mb-1 text-sm font-semibold text-zinc-100">Python phrases you needed hints for</h3>
      {!top.length ? (
        <p className="text-sm text-zinc-400">Nothing yet. Every hint you open in Blueprint builder is counted against the Python phrases that step uses, so your weak spots show up here.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-500">{onPick ? 'Pick one to see the problems that use it.' : 'Click one to see the exact syntax.'}</p>
          <ul className="space-y-1.5">
            {top.map(([id, n]) => (
              <li key={id}>
                <button onClick={() => (onPick ? onPick(id) : setShown(shown === id ? undefined : id))} className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left text-sm hover:bg-zinc-950/60 ${active === id ? 'bg-violet-500/10 text-violet-200' : 'text-zinc-300'}`}>
                  <span>{IDIOMS[id].label}</span>
                  <span className="rounded bg-amber-500/10 px-1.5 font-mono text-xs text-amber-300">×{n}</span>
                </button>
                {(shown === id || active === id) && <pre className="mt-1 rounded-md bg-zinc-950 px-3 py-2 font-mono text-[12.5px] text-emerald-200">{IDIOMS[id].example}</pre>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

type Shown = StepReport['status'] | 'syntax' | 'pending';

const pyText = (s?: string) => (s ?? '').replace(/\bnull\b/g, 'None').replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False');
const lineGoal = (what?: string) => (what?.startsWith('return') ? `should ${what}` : `should make ${what}`);
const lineDone = (what?: string) => (what?.startsWith('return') ? `does ${what}` : `makes ${what}`);

function refCode(p: Blueprint) {
  return `${p.signature}\n${p.steps.map((s, i) => `    # Step ${i + 1}: ${s.text}\n${indent(s.code)}`).join('\n')}\n`;
}

/** Lines of real code typed under a step's comment. */
function stepRegion(code: string, i: number) {
  const lines = code.split('\n');
  const at = lines.findIndex((l) => new RegExp(`^\\s*#\\s*Step\\s*${i + 1}\\b`, 'i').test(l));
  if (at < 0) return { at, end: at, body: [] as string[] };
  let end = at + 1;
  while (end < lines.length && !/^\s*#\s*Step\s*\d+/i.test(lines[end])) end++;
  return { at, end, body: lines.slice(at + 1, end).filter((l) => l.trim() && !l.trim().startsWith('#')) };
}

function Workbench({ p, onBack, onNext }: { p: Blueprint; onBack: () => void; onNext: (id: string) => void }) {
  const prev = getStatus()[p.id];
  const startBlind = !!prev?.guided && !prev?.blind;
  const [blind, setBlind] = useState(startBlind);
  const ownInit = !startBlind && getLocal<string>(MODE_KEY, 'own') === 'own';
  const [code, setCode] = useState(() => (ownInit ? `${p.signature}\n    \n` : starter(p, startBlind)));
  const [levels, setLevels] = useState<Level[]>(() => p.steps.map(() => 0));
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<RunResult>();
  const [pasteNote, setPasteNote] = useState(false);
  const [passed, setPassed] = useState(false);
  const [check, setCheck] = useState<StepCheck>();
  // "own" = you write the plan in your own words first; "blueprint" = use the given steps.
  const [own, setOwn] = useState<boolean>(ownInit);
  const [ownSteps, setOwnSteps] = useState<PlanStep[] | null>(null);
  const [ownReview, setOwnReview] = useState<PlanReview | null>(null);
  const [notes, setNotes] = useState<Record<number, { ok: boolean; note: string }>>({});
  const [coach, setCoach] = useState('');
  const [perf, setPerf] = useState<PerfResult | null>(null);
  const [lastGood, setLastGood] = useState<StepReport[]>();
  const [checking, setChecking] = useState(false);
  const seq = useRef(0);
  const sample = useSample();
  const hintsUsed = levels.reduce<number>((a, l) => a + l, 0);
  const fname = p.signature.match(/(?:def|class) (\w+)/)![1];
  const ref = useMemo(() => refCode(p), [p]);

  const runCheck = async (src: string) => {
    const my = ++seq.current;
    setChecking(true);
    const c = await checkSteps({ user: src, ref, fname, call: p.func, tests: p.tests, expected: p.expected, postlude: p.postlude, nsteps: p.steps.length });
    if (my !== seq.current) return c;
    setChecking(false);
    setCheck(c);
    if (c.steps) setLastGood(c.steps);
    return c;
  };

  // Check the logic a moment after you stop typing.
  useEffect(() => {
    if (own) return; // your own plan is judged by the tests, the speed check and AI, not the blueprint's steps
    const t = setTimeout(() => runCheck(code), 900);
    return () => clearTimeout(t);
  }, [code, own]);  

  const switchOwn = (on: boolean) => {
    setLocal(MODE_KEY, on ? 'own' : 'blueprint');
    setOwn(on); setOwnSteps(null); setOwnReview(null); setNotes({}); setCoach(''); setPerf(null);
    setCode(on ? `${p.signature}\n    \n` : starter(p, false)); setR(undefined); setPassed(false); setCheck(undefined); setLastGood(undefined);
  };
  const startOwn = (steps: PlanStep[], review: PlanReview) => {
    setOwnSteps(steps); setOwnReview(review); setNotes({}); setCoach('');
    setCode(`${p.signature}\n${steps.map((x, i) => `    # Step ${i + 1}: ${x.text}`).join('\n')}\n`);
  };
  const insertAt = (i: number, tmpl: string) => {
    const { at, end, body } = stepRegion(code, i);
    if (body.length) return;
    const lines = code.split('\n');
    if (at >= 0) { let k = end; while (k > at + 1 && !lines[k - 1].trim()) k--; lines.splice(k, 0, indent(tmpl)); setCode(lines.join('\n')); }
  };
  const askStep = async (i: number) => {
    if (!sample || !ownSteps) return '';
    try {
      const r = await sample(`You are a patient Python coach. Problem: ${p.title}. ${p.statement}\nThe student's own plan:\n${ownSteps.map((x, k) => `${k + 1}. ${x.text}`).join('\n')}\nTheir code so far:\n${code}\n\nThey want help with step ${i + 1}: "${ownSteps[i].text}". In under 80 words, plain text: say what this step must do, point at what's off in their lines for it (if anything), and give the Python syntax they need. Show at most one line of code.`, { cache: false });
      return r.text.trim();
    } catch { return 'Could not reach the AI right now.'; }
  };

  const reset = (b: boolean) => { if (b) { setOwn(false); setOwnSteps(null); } setPerf(null); setNotes({}); setCoach(''); setBlind(b); setCode(starter(p, b)); setLevels(p.steps.map(() => 0)); setR(undefined); setPassed(false); setCheck(undefined); setLastGood(undefined); };

  function hint(i: number) {
    const next = Math.min(3, levels[i] + 1) as Level;
    if (next === levels[i]) return;
    setLevels(levels.map((l, j) => (j === i ? next : l)));
    const counts = getIdiomHints();
    for (const id of p.steps[i].idioms) counts[id] = (counts[id] ?? 0) + 1;
    setLocal(IDIOM_HINTS, counts);
    if (next === 2) insertTemplate(i);
  }

  /** Level 2: put the fill in the blank lines under the step's comment, but only if you haven't started that step. */
  function insertTemplate(i: number) {
    const { at, end, body } = stepRegion(code, i);
    if (body.length) return;
    const lines = code.split('\n');
    const tmpl = indent(p.steps[i].template);
    if (at >= 0) {
      let k = end;
      while (k > at + 1 && !lines[k - 1].trim()) k--;
      lines.splice(k, 0, tmpl);
      setCode(lines.join('\n'));
    } else setCode(code.replace(/\s*$/, '') + '\n' + tmpl + '\n');
  }

  async function run() {
    const checked = own ? Promise.resolve({} as StepCheck) : runCheck(code);
    setPerf(null);
    if (/____/.test(code)) { setR(undefined); return; }
    setBusy(true);
    const src = code + (p.postlude ? '\n\n' + p.postlude + '\n' : '');
    const res = await runTests(src, p.func, 'code', p.tests, p.expected, 'exact');
    setBusy(false);
    setR(res);
    const ok = !res.compileError && !res.timeout && !res.loadError && res.results.length > 0 && res.results.every((t) => t.ok);
    if (!ok) {
      // Remember what went wrong, so Today and Stats can train you on it.
      const kinds = new Set<string>();
      for (const l of lint(code, p)) { const k = SLIP_KINDS.find((x) => x.re.test(l.msg)); if (k) kinds.add(k.kind); }
      const c = await checked;
      for (const st of c.steps ?? []) {
        if (st.status === 'wrong') (st.cats?.length ? st.cats : ['path']).forEach((x) => kinds.add(`logic:${x === 'off1' ? 'off1' : x}`));
        if (st.status === 'loop') kinds.add('logic:loop');
        if (st.status === 'error') kinds.add('logic:error');
      }
      for (const k of kinds) logMistake({ source: 'blueprint', kind: k, label: p.title, ref: p.id });
    }
    if (!ok && own && ownSteps && sample) {
      // AI coach: which of YOUR steps is off
      const failure = res.compileError ?? res.results.filter((t) => !t.ok).slice(0, 2).map((t, k) => `Test ${k + 1}: ${t.error ?? `got ${t.got}, expected ${t.expected}`}`).join('\n');
      setCoach('Looking at your steps…');
      const c = await coachRun(p, ownSteps, code, failure || 'tests failed', sample);
      if (c) { setCoach(c.summary); setNotes(Object.fromEntries((c.steps ?? []).map((x) => [x.n - 1, { ok: !!x.ok, note: x.note }]))); } else setCoach('');
    }
    if (ok) {
      setNotes({}); setCoach('');
      // Correct is half of it: is it as fast as the optimal solution?
      if (p.pattern !== 'backtracking') checkPerf({ user: src, ref: p.solution, call: p.func, tests: p.tests, postlude: p.postlude }).then(setPerf);
    }
    if (ok && !passed) {
      setPassed(true);
      const all = getStatus();
      const cur = all[p.id] ?? {};
      all[p.id] = blind ? { ...cur, blind: Date.now(), guided: cur.guided ?? Date.now() } : { ...cur, guided: Date.now(), clean: hintsUsed === 0, hints: hintsUsed };
      setLocal(STATUS, all);
      setLocal(LOG, [...blueprintLog().slice(-200), { at: Date.now(), id: p.id, blind }]);
    }
  }

  // What each step card shows. Passing every test means your logic is right, even if it differs from the blueprint.
  const reports: (StepReport | undefined)[] = p.steps.map((_, i) => (check?.steps ?? lastGood)?.[i]);
  const shown: Shown[] = p.steps.map((_, i) => {
    if (passed) return 'ok';
    if (check?.syntax && check.syntax.step === i + 1) return 'syntax';
    return reports[i]?.status ?? 'pending';
  });
  const current = shown.findIndex((s) => s !== 'ok');
  const doneSteps = shown.filter((s) => s === 'ok').length;

  const firstErr = r?.compileError ?? r?.results.find((t) => t.error)?.error;
  const friendly = firstErr ? explainError(firstErr, code, p) : null;
  const liveLint = lint(code, p).filter((x) => !x.msg.includes('____') && !x.msg.startsWith('Keep the name'));
  const blanks = /____/.test(code);
  // Today's NeetCode problems from the checklist: after this one, go to the other.
  const todays = getLocal<{ picks?: string[] }>(`pyforge.daily.${today()}`, {}).picks ?? [];
  const otherSlug = todays.includes(p.nc) ? todays.find((sl) => sl !== p.nc) : undefined;
  const otherNC = otherSlug ? NEETCODE.find((x) => x.slug === otherSlug) : undefined;
  const otherBp = otherSlug ? BLUEPRINTS.find((b) => b.nc === otherSlug) : undefined;
  const nextP = otherBp ?? BLUEPRINTS[(BLUEPRINTS.indexOf(p) + 1) % BLUEPRINTS.length];

  return (
    // On wide screens the workbench fills the window: left and right scroll on their own.
    <div className="flex w-full flex-col lg:h-[calc(100vh-4rem)]">
      <button onClick={onBack} className="mb-3 flex shrink-0 items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"><ChevronLeft size={15} />All blueprints</button>
      <div className="mb-4 flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">{p.title}</h2>
        <span className="text-sm text-zinc-500">{lessonName(p.pattern)} · {p.difficulty}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${blind ? 'bg-emerald-500/10 text-emerald-300' : 'bg-violet-500/10 text-violet-200'}`}>{blind ? 'Blind pass: no blueprint' : own ? 'Your own plan' : 'With blueprint'}</span>
      </div>
      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="min-w-0 space-y-4 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pb-6 lg:pr-2">
          <Card className="p-4">
            <p className="text-[15px] text-zinc-200">{p.statement}</p>
            <p className="mt-2 font-mono text-[13px] text-zinc-400">{p.example}</p>
            <a href={`https://neetcode.io/problems/${p.nc}`} target="_blank" rel="noreferrer" className="link mt-2 inline-block text-sm">NeetCode page and video</a>
          </Card>
          {!blind && (
            <div className="inline-flex rounded-md border border-zinc-800 bg-zinc-900 p-0.5 text-sm">
              <button onClick={() => !own && switchOwn(true)} className={`rounded px-3 py-1.5 ${own ? 'bg-zinc-950 font-semibold text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'}`}>My own plan</button>
              <button onClick={() => own && switchOwn(false)} className={`rounded px-3 py-1.5 ${!own ? 'bg-zinc-950 font-semibold text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'}`}>Blueprint steps</button>
            </div>
          )}
          {blind ? (
            <BlindPanel p={p} check={check} ran={!!r} passed={passed} onBack={() => reset(false)} />
          ) : own ? (
            !ownSteps ? (
              <PlanWriter p={p} sample={sample} onReady={startOwn} onCancel={() => switchOwn(false)} />
            ) : (
              <>
                {ownReview && (
                  <Card className="p-3 text-sm">
                    <span className="text-zinc-300">{ownReview.feedback}</span>{' '}
                    <button className="link" onClick={() => { setOwnSteps(null); setNotes({}); setCoach(''); }}>Rewrite my plan</button>
                  </Card>
                )}
                {coach && <Card className="border-violet-500/40 p-3 text-sm text-zinc-200"><span className="font-medium text-violet-200">{aiName()}: </span>{coach}</Card>}
                <ol className="space-y-3">
                  {ownSteps.map((x, i) => <OwnStepCard key={i} i={i} s={x} note={notes[i]} sample={sample} onInsert={(t) => insertAt(i, t)} onAsk={() => askStep(i)} />)}
                </ol>
                <p className="text-xs text-zinc-500">Your plan, your names. It's correct when the tests pass, and optimal when the speed check matches the best solution.</p>
              </>
            )
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(doneSteps / p.steps.length) * 100}%` }} /></div>
                <span className="tnum text-zinc-400">{doneSteps}/{p.steps.length} steps right</span>
                {checking && <span className="text-xs text-zinc-500">checking…</span>}
              </div>
              <p className="-mt-2 text-xs text-zinc-500">Write each step in your own words and names. The checker runs your code next to the blueprint and compares what each step actually produces, so any correct way counts.</p>
              <ol className="space-y-3">
                {p.steps.map((s, i) => (
                  <StepCard key={i} i={i} s={s} p={p} level={levels[i]} onHint={() => hint(i)} rep={reports[i]} shown={shown[i]} isCurrent={i === current}
                    syntax={check?.syntax?.step === i + 1 ? check.syntax : undefined} code={code} sample={sample} />
                ))}
              </ol>
            </>
          )}
        </div>

        <div className="min-w-0 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pb-6 lg:pr-1">
          <CodeEditor value={code} onChange={(v) => { setCode(v); setPasteNote(false); }} onRun={run}
            errorLine={check?.syntax?.line ?? r?.line ?? r?.results.find((t) => t.line)?.line} minRows={18}
            onPaste={(e) => { e.preventDefault(); setPasteNote(true); }} />
          {pasteNote && <p className="mt-2 text-sm text-amber-300">Paste is off here. Typing it is the whole point: that's what builds the reflex.</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={run} disabled={busy}><Play size={14} />{busy ? 'Running…' : 'Run tests'}</Button>
            <span className="text-xs text-zinc-500">Ctrl or Cmd + Enter</span>
            <span className="flex-1" />
            {!blind && <Button variant="ghost" onClick={() => reset(true)}><EyeOff size={14} />Blind pass</Button>}
            <Button variant="ghost" onClick={() => reset(blind)}><RotateCcw size={14} />Start over</Button>
          </div>

          {liveLint.length > 0 && (
            <Card className="mt-3 border-amber-500/40 p-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">Python slips spotted</h3>
              <ul className="space-y-1 text-sm text-zinc-200">
                {liveLint.slice(0, 6).map((x, i) => <li key={i}>{x.line ? <span className="mr-2 font-mono text-xs text-zinc-500">line {x.line}</span> : null}{x.msg}</li>)}
              </ul>
            </Card>
          )}
          {blanks && <p className="mt-3 text-sm text-zinc-400">Fill every <span className="font-mono">____</span> blank, then the tests can run.</p>}
          {busy && !r && <p className="mt-3 text-sm text-zinc-500">Starting Python the first time takes a few seconds…</p>}
          {r && <Results r={r} p={p} friendly={friendly} />}
          {perf && !perf.skip && (
            <Card className={`mt-3 p-4 ${perf.slow ? 'border-amber-500/40' : 'border-emerald-500/30'}`}>
              <p className={`font-semibold ${perf.slow ? 'text-amber-300' : 'text-emerald-300'}`}>{perf.slow ? 'Correct, but not optimal yet' : 'Speed check: as fast as the optimal solution'}</p>
              <p className="mt-1 text-sm text-zinc-300">{perf.timeout ? 'On a bigger input your code took more than 7 seconds while the optimal one is near instant. Look for a loop inside a loop, or a list where a set or dict would answer in O(1).' : perf.slow ? `On an input of ${perf.n?.toLocaleString()} items yours took ${perf.mine}s and the optimal solution ${perf.ref}s, about ${Math.round(perf.ratio ?? 0)}× slower. That usually means a worse time complexity, like a nested loop or searching a list with "in".` : `Tested on ${perf.n?.toLocaleString()} items: ${perf.mine}s vs ${perf.ref}s for the optimal solution.`}</p>
            </Card>
          )}

          {passed && (
            <Card className="mt-3 border-emerald-500/40 p-4">
              <p className="font-semibold text-emerald-300">{perf?.slow ? 'Correct. Next: make it optimal.' : blind ? 'Passed blind. This one is yours now.' : own ? 'Your plan works.' : hintsUsed === 0 ? 'Passed with no hints.' : `Passed, using ${hintsUsed} hint level${hintsUsed === 1 ? '' : 's'}.`}</p>
              <p className="mt-1 text-sm text-zinc-300">{perf?.slow ? 'Rewrite the plan with a faster idea, or switch to the blueprint steps to see the optimal one.' : blind ? 'Come back in a few days and do it blind once more. Speed comes from repeats.' : 'Now type it again with no plan at all. The second time is what moves it from copying to recall.'}</p>
              {!perf?.slow && (
                <div className="mt-3 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
                  <span className="font-medium text-zinc-100">Now submit it on NeetCode.</span> Without looking at your code here, open the problem there and type it again from memory. That's your blind pass, and it ticks the problem off on NeetCode and in your progress here.
                  <div className="mt-2"><a href={`https://neetcode.io/problems/${p.nc}`} target="_blank" rel="noreferrer" className="link font-medium">Submit {p.title} on NeetCode</a></div>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {otherNC && !otherBp ? (
                  <a href={otherNC.url} target="_blank" rel="noreferrer"><Button>Next today: {otherNC.name} on NeetCode</Button></a>
                ) : (
                  <Button variant={otherBp ? 'primary' : 'ghost'} onClick={() => onNext(nextP.id)}>{otherBp ? `Next today: ${nextP.title}` : `Next: ${nextP.title}`}</Button>
                )}
                {!blind && !otherBp && <Button variant="ghost" onClick={() => reset(true)}><EyeOff size={14} />Blind pass here instead</Button>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StepCard({ i, s, p, level, onHint, rep, shown, isCurrent, syntax, code, sample }: {
  i: number; s: Blueprint['steps'][number]; p: Blueprint; level: Level; onHint: () => void; rep?: StepReport; shown: Shown; isCurrent: boolean;
  syntax?: { msg: string; line?: number }; code: string; sample: SampleFn | null | undefined;
}) {
  const [ai, setAi] = useState(''); const [aiBusy, setAiBusy] = useState(false);
  const typedNorm = useMemo(() => new Set(code.split('\n').map(norm).filter(Boolean)), [code]);
  // A later step can't be fully judged while an earlier one is wrong, but its own slip is still worth showing.
  const blocked = !!rep?.after && (shown === 'empty' || shown === 'loop' || shown === 'error');
  const dependsOn = rep?.after && shown === 'wrong' ? rep.after : undefined;
  const pill: Record<Shown, [string, string]> = {
    ok: ['Logic matches', 'bg-emerald-500/15 text-emerald-300'],
    wrong: ['Not right yet', 'bg-rose-500/15 text-rose-300'],
    empty: ['Not written yet', 'bg-zinc-800 text-zinc-400'],
    error: ['Error', 'bg-rose-500/15 text-rose-300'],
    loop: ['Loops forever', 'bg-rose-500/15 text-rose-300'],
    syntax: ['Not valid Python yet', 'bg-amber-500/15 text-amber-300'],
    pending: ['', ''],
  };
  const [label, cls] = blocked ? [`Waiting on step ${rep!.after}`, 'bg-zinc-800 text-zinc-400'] : pill[shown];
  const showLines = rep && rep.lines.some((l) => l.status !== 'flow') && (isCurrent || shown === 'wrong') && !blocked;
  const mine = stepRegion(code, i).body;

  async function askClaude() {
    if (!sample) return;
    setAiBusy(true); setAi('');
    const prompt = `You are a patient Python coach helping a student who knows the logic but freezes when typing code. Problem: ${p.title}. ${p.statement}\nThe plan has 4 steps. They're on step ${i + 1}: "${s.text}".\nTheir whole function right now:\n\n${code}\n\nTheir lines for this step:\n${mine.join('\n') || '(nothing yet)'}\n\nAn automatic checker that runs their code next to a reference says:\n${(rep?.why ?? []).join('\n') || (syntax ? `Syntax error on line ${syntax.line}: ${syntax.msg}` : rep?.error?.msg ?? 'nothing specific')}\n\nReply in under 120 words, plain text, no markdown headers. First say in one sentence what this step must accomplish. Then point at the exact line of theirs that's off and explain why, in terms of what value it should hold for a small example. End with a question that nudges them to the fix. Don't write the full solution. You may show at most one corrected line only if they are clearly stuck on syntax.`;
    try {
      const out = await sample(prompt, { onText: ({ text }: { text: string }) => setAi(text), cache: false });
      setAi(out.text);
    } catch { setAi('Could not reach the AI right now. Try again in a minute.'); }
    setAiBusy(false);
  }

  return (
    <li>
      <Card className={`p-4 ${isCurrent ? 'ring-1 ring-violet-500/60' : ''}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${shown === 'ok' ? 'bg-emerald-500/15 text-emerald-300' : shown === 'wrong' || shown === 'error' || shown === 'loop' ? 'bg-rose-500/15 text-rose-300' : 'bg-zinc-800 text-zinc-300'}`}>
            {shown === 'ok' ? <Check size={13} /> : i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[15px] text-zinc-100">{s.text}</p>
              {label && <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>}
            </div>

            {blocked && <p className="mt-1 text-sm text-zinc-500">Fix step {rep!.after} first. This step uses what that one makes, so it can't be judged yet.</p>}

            {syntax && (
              <div className="mt-2 rounded-md border border-amber-500/40 px-3 py-2 text-sm">
                <div className="text-zinc-100">Line {syntax.line}: {syntaxHelp(syntax.msg, code.split('\n')[(syntax.line ?? 1) - 1] ?? '')}</div>
                <div className="mt-1 font-mono text-xs text-zinc-500">{syntax.msg}</div>
              </div>
            )}

            {!blocked && shown === 'wrong' && rep?.why && (
              <div className="mt-2 rounded-md border border-rose-500/30 px-3 py-2 text-sm">
                <div className="mb-1 font-medium text-rose-300">Why it's off</div>
                <ul className="space-y-1.5 text-zinc-200">{rep.why.map((w, k) => <li key={k}>{w}</li>)}</ul>
                <div className="mt-2 border-t border-zinc-800 pt-2 text-zinc-400"><span className="text-zinc-300">How to think about it: </span>say the goal out loud first ("{s.text.toLowerCase()}"). Then run the example input through your lines in your head and write down what each one leaves behind. The first value that doesn't match is the line to fix.</div>
                {dependsOn && <div className="mt-1 text-xs text-zinc-500">Step {dependsOn} is also off, so recheck this one after fixing that.</div>}
              </div>
            )}
            {!blocked && shown === 'error' && rep?.error && (
              <div className="mt-2 rounded-md border border-rose-500/30 px-3 py-2 text-sm">
                <div className="text-zinc-100">{explainError(rep.error.msg, code, p) ?? 'This step crashes when it runs.'}</div>
                <div className="mt-1 font-mono text-xs text-rose-300">{rep.error.msg}{rep.error.line ? ` (line ${rep.error.line})` : ''}</div>
              </div>
            )}
            {!blocked && shown === 'loop' && (
              <p className="mt-2 rounded-md border border-rose-500/30 px-3 py-2 text-sm text-zinc-200">
                This step never finishes{rep?.loop?.line ? ` (stuck around line ${rep.loop.line})` : ''}. In a while loop, something inside the body has to move toward making the condition false: a pointer moves, a count goes up, an item is removed.
              </p>
            )}

            {showLines && (
              <ul className="mt-2 space-y-1 text-sm">
                {rep!.lines.map((l, k) => (
                  <li key={k} className="flex gap-2">
                    <span className={`mt-0.5 w-4 shrink-0 text-center ${l.status === 'ok' ? 'text-emerald-400' : l.status === 'miss' ? 'text-zinc-500' : 'text-zinc-600'}`}>{l.status === 'ok' ? '✓' : l.status === 'miss' ? '○' : '·'}</span>
                    <span className={l.status === 'ok' ? 'text-zinc-400' : l.status === 'miss' ? 'text-zinc-200' : 'text-zinc-500'}>
                      Line {k + 1} {l.status === 'flow' ? 'is a loop, if or helper the next lines build on' : l.status === 'ok' ? lineDone(l.what) : lineGoal(l.what)}
                    </span>
                  </li>
                ))}
                <li className="pl-6 text-xs text-zinc-500">Values are for the first test input. Your names and wording can be anything.</li>
              </ul>
            )}

            {level >= 1 && <p className="mt-2 text-sm text-zinc-300"><span className="font-medium text-amber-300">Clue: </span>{s.clue}</p>}
            {level >= 2 && (
              <div className="mt-2">
                <div className="text-xs text-zinc-500">Fill in the blank{mine.length ? '' : ' (added to your editor)'}:</div>
                <pre className="mt-1 overflow-x-auto rounded-md bg-zinc-950 px-3 py-2 font-mono text-[12.5px] text-zinc-300">{s.template}</pre>
              </div>
            )}
            {level >= 3 && (
              <div className="mt-2">
                <div className="text-xs text-zinc-500">The blueprint's lines. Type them yourself (paste is off), then say what each one does:</div>
                <pre className="mt-1 overflow-x-auto rounded-md bg-zinc-950 px-3 py-2 font-mono text-[12.5px]">
                  {s.code.split('\n').map((ln, k) => <div key={k} className={typedNorm.has(norm(ln)) ? 'text-emerald-300' : 'text-zinc-100'}>{ln}</div>)}
                </pre>
              </div>
            )}
            {ai && <div className="mt-2 whitespace-pre-wrap rounded-md border border-violet-500/30 px-3 py-2 text-sm text-zinc-200">{ai}</div>}
            {shown !== 'ok' && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {level < 3 && (
                  <button onClick={onHint} className="flex items-center gap-1 text-sm text-violet-300 hover:underline">
                    <Lightbulb size={14} />{level === 0 ? 'Hint: syntax clue' : level === 1 ? 'Hint: fill in the blank' : 'Hint: show the lines'}
                  </button>
                )}
                {sample && (shown === 'wrong' || shown === 'syntax' || shown === 'error') && !blocked && (
                  <button onClick={askClaude} disabled={aiBusy} className="flex items-center gap-1 text-sm text-violet-300 hover:underline"><Sparkles size={14} />{aiBusy ? 'Asking…' : `Ask ${aiName() ?? 'AI'} to explain`}</button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </li>
  );
}

/** Plain English for the syntax errors people hit while translating logic into Python. */
function syntaxHelp(msg: string, line: string) {
  const t = line.trim();
  if (/____/.test(t)) return 'there is still a ____ blank to fill in.';
  if (/^(int|long|double|float|String|string|char|bool|boolean|var|let|const|auto)\s+\w+\s*=/.test(t)) return `Python doesn't declare types. Just write ${t.replace(/^\w+\s+/, '')}`;
  if (/^(def|if|elif|else|for|while|try|except|class|with)\b/.test(t) && !t.includes(':')) return 'a line that starts a block has to end with a colon.';
  if (/\belse\s+if\b/.test(t)) return 'Python spells else if as elif.';
  if (/&&|\|\|/.test(t)) return 'Python uses and / or.';
  if (/\w(\+\+|--)/.test(t)) return 'Python has no ++ or --. Use += 1 or -= 1.';
  if (/[{};]\s*$/.test(t)) return "Python doesn't use braces or semicolons. Blocks are made by the colon and indentation.";
  if (/indent/i.test(msg)) return "the indentation doesn't line up. Inside the function is 4 spaces, and each loop or if adds 4 more.";
  if (/never closed|unmatched|was never closed/i.test(msg)) return 'a bracket or parenthesis is not closed (or closed twice).';
  if (/'=' |cannot assign|Maybe you meant '=='/i.test(msg)) return 'use == to compare. A single = stores a value.';
  return "this line isn't valid Python yet. Read it left to right and check each symbol.";
}

function BlindPanel({ p, check, ran, passed, onBack }: { p: Blueprint; check?: StepCheck; ran: boolean; passed: boolean; onBack: () => void }) {
  const st = check?.steps;
  const firstBad = st?.find((s) => s.status !== 'ok');
  return (
    <Card className="p-4">
      <h3 className="mb-1 text-sm font-semibold text-zinc-100">No steps this time</h3>
      <p className="text-sm text-zinc-400">Write it from the function line. Say the 4 steps to yourself first, then type. This pass is what makes it stick.</p>
      {ran && !passed && st ? (
        <div className="mt-3">
          <div className="mb-1 text-xs text-zinc-500">Which blueprint steps your code already does:</div>
          <ul className="space-y-1 text-sm">
            {st.map((s) => (
              <li key={s.step} className="flex gap-2"><span className={s.status === 'ok' ? 'text-emerald-400' : 'text-zinc-500'}>{s.status === 'ok' ? '✓' : '○'}</span><span className={s.status === 'ok' ? 'text-zinc-400' : 'text-zinc-200'}>Step {s.step}{s.status === 'ok' ? '' : ': not yet'}</span></li>
            ))}
          </ul>
          {firstBad?.why?.[0] && <p className="mt-2 rounded-md border border-rose-500/30 px-3 py-2 text-sm text-zinc-200">{firstBad.why[0]}</p>}
        </div>
      ) : (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-500">
          {p.steps.map((s, i) => <li key={i} className="blur-[3px] transition hover:blur-0" title="Hover only if you're really stuck">{s.text}</li>)}
        </ol>
      )}
      <button onClick={onBack} className="link mt-3 text-sm">Stuck? Go back to the blueprint</button>
    </Card>
  );
}

function Results({ r, p, friendly }: { r: RunResult; p: Blueprint; friendly: string | null }) {
  const box = 'mt-3 rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-200';
  if (r.loadError) return <p className={box}>{r.loadError}</p>;
  if (r.timeout) return <p className={box}>Your code ran for more than 8 seconds. Look for a while loop whose pointer never moves.</p>;
  if (r.compileError) return (
    <div className={box}>
      <div className="font-mono">{r.compileError}{r.line ? ` (line ${r.line})` : ''}</div>
      {friendly && <div className="mt-2 text-zinc-100">{friendly}</div>}
    </div>
  );
  const passed = r.results.filter((t) => t.ok).length;
  const fmtArgs = (a: unknown[]) => pyText(a.map((x) => JSON.stringify(x)).join(', '));
  return (
    <Card className="mt-3 p-4">
      <p className={`mb-2 font-semibold ${passed === r.results.length ? 'text-emerald-300' : 'text-rose-300'}`}>{passed}/{r.results.length} tests passed</p>
      {friendly && <p className="mb-2 rounded-md border border-amber-500/40 px-3 py-2 text-sm text-zinc-100">{friendly}</p>}
      {passed < r.results.length && <p className="mb-2 text-sm text-zinc-400">The step cards on the left show which step is producing the wrong values.</p>}
      <ul className="space-y-1.5">
        {r.results.map((t, i) => (
          <li key={i} className="rounded-md bg-zinc-950 px-3 py-2 text-[13px]">
            <span className={`font-medium ${t.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{t.ok ? 'Passed' : 'Failed'}</span>
            <span className="ml-2 font-mono text-zinc-500">{p.func}({fmtArgs(p.tests[i]).slice(0, 90)})</span>
            {!t.ok && (
              <div className="mt-1 font-mono text-zinc-300">
                {t.error ? <div className="text-rose-300">{t.error}{t.line ? ` (line ${t.line})` : ''}</div> : <div>Got {pyText(t.got)}, expected {pyText(t.expected)}</div>}
              </div>
            )}
            {t.stdout && <pre className="mt-1 whitespace-pre-wrap font-mono text-zinc-500">printed: {t.stdout}</pre>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

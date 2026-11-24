import { BookOpen, CheckCircle2, Play, RotateCcw, Timer, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PATTERN_DRILLS } from '../data';
import { FINDER_BY_ID, FINDER_PATTERNS } from '../data/finder';
import { ORIGINAL_DRILLS } from '../data/originalProblems';
import { LESSON_BY_ID } from '../data/lessons';
import { COMPANY_NAME } from '../data/meta';
import { shuffle } from '../lib/check';
import { highlight } from '../lib/highlight';
import { getLocal, mastery, setLocal, today } from '../lib/storage';
import { logMistake } from '../lib/mistakes';
import type { PatternExercise, Progress } from '../types';
import { Bar, Button, Card, CompanyTags, DiffTag, Kbd } from './ui';

interface Props {
  queue: PatternExercise[];
  progress: Progress;
  filterId: string; // pattern|company the session was built for
  onResult: (id: string, quality: 0 | 1 | 2 | 3, tags: string[]) => void;
  onLearn?: (lessonId: string) => void;
}

const SESSION = 10;
const SAVE_PREFIX = 'pyforge.finder.session.v2.';
const ANSWERS = 'pyforge.finder.answers';
const DONE = 'pyforge.finder.sessionsDone';
export const finderSessionsDone = () => getLocal<number[]>(DONE, []);
/** Where your current pattern finder session is: question number and length. */
export function finderSessionNow(): { pos: number; len: number } | null {
  try {
    const k = Object.keys(localStorage).filter((x) => x.startsWith(SAVE_PREFIX));
    const live = k.map((x) => getLocal<Saved | null>(x, null)).filter((x): x is Saved => !!x && !x.summary).sort((a, b) => b.savedAt - a.savedAt)[0];
    return live ? { pos: live.log.length, len: live.ids.length } : null;
  } catch { return null; }
}
/** Every answer you give, so the daily checklist counts answers (retries included), not distinct problems. */
export const finderAnswers = () => getLocal<{ at: number; id: string; right: boolean }[]>(ANSWERS, []);
const TARGETS = [{ s: 0, label: 'No target' }, { s: 60, label: '60 s' }, { s: 90, label: '90 s' }, { s: 120, label: '2 min' }];
const fmtS = (x: number) => (x >= 60 ? `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}` : `${x.toFixed(0)}s`);
const BY_ID = Object.fromEntries([...PATTERN_DRILLS, ...ORIGINAL_DRILLS].map((e) => [e.id, e])) as Record<string, PatternExercise>;
const ORIGINALS_PER_SESSION = 3;

interface LogItem { id: string; title: string; secs: number; right: boolean; pick: string | null; retry?: boolean }
interface Saved {
  filterId: string;
  ids: string[]; // the session's questions in order (wrong answers add retries)
  retries: string[]; // ids added because you missed their pattern
  pos: number;
  options: Record<string, string[]>;
  log: LogItem[];
  pick: string | null; // answer for the question at pos, if already given
  elapsed: number; // seconds spent on the question at pos so far
  running: boolean;
  summary: boolean;
  savedAt: number;
}

/** How you're doing on each pattern across every pattern finder answer you've ever given. */
export function finderStats(progress: Progress) {
  const by: Record<string, { seen: number; total: number; tries: number; right: number; mastery: number }> = {};
  for (const e of PATTERN_DRILLS) {
    const s = (by[e.answer] ??= { seen: 0, total: 0, tries: 0, right: 0, mastery: 0 });
    const c = progress.cards[e.id];
    s.total++;
    if (c?.attempts) { s.seen++; s.tries += c.attempts; s.right += c.correct; }
    s.mastery += mastery(c);
  }
  // original problems count toward your accuracy on each pattern
  for (const e of ORIGINAL_DRILLS) {
    const c = progress.cards[e.id];
    const s = by[e.answer];
    if (s && c?.attempts) { s.tries += c.attempts; s.right += c.correct; }
  }
  const rows = Object.entries(by).map(([id, s]) => ({ id, name: FINDER_BY_ID[id]?.name ?? id, ...s, mastery: s.mastery / s.total, acc: s.tries ? s.right / s.tries : 0 }));
  const seen = rows.reduce((a, r) => a + r.seen, 0);
  const tries = rows.reduce((a, r) => a + r.tries, 0);
  const right = rows.reduce((a, r) => a + r.right, 0);
  return { rows, seen, total: PATTERN_DRILLS.length, acc: tries ? right / tries : 0, tries };
}

/** Builds a session: reviews that are due, then problems from your weakest patterns, then new ones. */
function buildSession(queue: PatternExercise[], progress: Progress): string[] {
  const st = finderStats(progress);
  const weak = new Map(st.rows.map((r) => [r.id, r.tries ? r.acc : 0.5]));
  const now = Date.now();
  const due = queue.filter((e) => progress.cards[e.id] && progress.cards[e.id].due <= now);
  const missedLast = queue.filter((e) => progress.cards[e.id]?.lastResult === false && !due.includes(e));
  const rest = queue.filter((e) => !due.includes(e) && !missedLast.includes(e))
    .map((e) => ({ e, w: (weak.get(e.answer) ?? 0.5) + (progress.cards[e.id] ? 0.3 : 0) + Math.random() * 0.25 }))
    .sort((a, b) => a.w - b.w).map((x) => x.e);
  const realLen = SESSION - ORIGINALS_PER_SESSION;
  const ids = [...new Set([...missedLast, ...due, ...rest].map((e) => e.id))].slice(0, realLen);
  // Fewer unlocked than that: a second look at the ones you know least.
  const weakest = [...ids].sort((a, b) => mastery(progress.cards[a]) - mastery(progress.cards[b]));
  for (let i = 0; ids.length < realLen && weakest.length; i++) {
    const id = weakest[i % weakest.length];
    if (ids[ids.length - 1] !== id || weakest.length === 1) ids.push(id);
  }
  // The last three are original problems in the style of big company loops, on patterns you've unlocked.
  const open = new Set(queue.map((e) => e.answer));
  const score = (e: PatternExercise) => {
    const c = progress.cards[e.id];
    return (c ? (c.lastResult === false ? 0.2 : c.due <= now ? 0.5 : 1 + mastery(c)) : 0.3) + (weak.get(e.answer) ?? 0.5) * 0.5 + Math.random() * 0.3;
  };
  let pool = ORIGINAL_DRILLS.filter((e) => open.has(e.answer));
  if (pool.length < ORIGINALS_PER_SESSION) pool = [...pool, ...ORIGINAL_DRILLS.filter((e) => !open.has(e.answer) && e.difficulty === 'easy')];
  const picked: string[] = [];
  const answersUsed = new Set<string>();
  for (const e of [...pool].sort((a, b) => score(a) - score(b))) {
    if (picked.length >= ORIGINALS_PER_SESSION) break;
    if (answersUsed.has(e.answer) && pool.filter((x) => !answersUsed.has(x.answer)).length) continue; // mix patterns when possible
    picked.push(e.id);
    answersUsed.add(e.answer);
  }
  for (const e of pool) { if (picked.length >= ORIGINALS_PER_SESSION) break; if (!picked.includes(e.id)) picked.push(e.id); }
  ids.push(...picked);
  return ids;
}

function makeOptions(ex: PatternExercise) {
  const conf = ex.confusers.filter((c) => c !== ex.answer && FINDER_BY_ID[c]).slice(0, 3);
  const fill = shuffle(FINDER_PATTERNS.map((p) => p.id).filter((id) => id !== ex.answer && !conf.includes(id))).slice(0, 3 - conf.length);
  return shuffle([ex.answer, ...conf, ...fill]);
}

function fresh(filterId: string, queue: PatternExercise[], progress: Progress, running = false): Saved {
  return { filterId, ids: buildSession(queue, progress), retries: [], pos: 0, options: {}, log: [], pick: null, elapsed: 0, running, summary: false, savedAt: Date.now() };
}

export default function PatternDrill({ queue, progress, filterId, onResult, onLearn }: Props) {
  // Picks up exactly where you left off, even after opening a lesson or another page.
  const [s, setS] = useState<Saved>(() => {
    const old = getLocal<Saved | null>(SAVE_PREFIX + filterId, null);
    if (old && old.filterId === filterId && old.ids.every((id) => BY_ID[id]) && old.pos < old.ids.length) return old.summary || old.pick !== null ? old : { ...old, running: false };
    return fresh(filterId, queue, progress);
  });
  const [target, setTarget] = useState(() => Number(localStorage.getItem('pyforge.finderTarget') ?? 90));
  const [secs, setSecs] = useState(s.elapsed);
  const start = useRef(Date.now() - s.elapsed * 1000);
  const ex = BY_ID[s.ids[s.pos]];
  const pick = s.pick;
  const done = pick !== null;
  const { running, summary, log } = s;

  const options = useMemo(() => (ex ? s.options[ex.id] ?? makeOptions(ex) : []), [ex, s.options]);
  useEffect(() => { if (ex && !s.options[ex.id]) setS((x) => ({ ...x, options: { ...x.options, [ex.id]: options } })); }, [ex?.id]);  

  // Save on every change, and save the stopwatch when you leave.
  useEffect(() => { setLocal(SAVE_PREFIX + filterId, { ...s, savedAt: Date.now() }); }, [s]);
  useEffect(() => () => {
    const cur = getLocal<Saved | null>(SAVE_PREFIX + filterId, null);
    if (cur && cur.pick === null && cur.running) setLocal(SAVE_PREFIX + filterId, { ...cur, elapsed: (Date.now() - start.current) / 1000 });
  }, []);

  // A stopwatch, not a countdown: you are never cut off, but the session report tells you if you were on pace.
  useEffect(() => {
    if (!running || done || summary) return;
    const t = setInterval(() => setSecs((Date.now() - start.current) / 1000), 250);
    return () => clearInterval(t);
  }, [running, done, summary, s.pos]);

  const goTo = (patch: Partial<Saved>) => {
    start.current = Date.now();
    setSecs(0);
    setS((x) => ({ ...x, ...patch, pick: null, elapsed: 0 }));
  };

  const finish = (p: string | null) => {
    if (done || !ex) return;
    const right = p === ex.answer;
    const took = (Date.now() - start.current) / 1000;
    setSecs(took);
    onResult(ex.id, right ? (target && took <= target / 2 ? 3 : 2) : 0, right ? [] : ['pattern-miss']);
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const bkey = `pyforge.finder.baseline.${today()}`;
    if (getLocal<number | null>(bkey, null) == null) {
      // first logged answer today: remember how many problems were already answered today before the log existed
      const logged = new Set(finderAnswers().filter((a) => a.at >= dayStart.getTime()).map((a) => a.id));
      const before = PATTERN_DRILLS.filter((e) => (progress.cards[e.id]?.lastSeen ?? 0) >= dayStart.getTime() && !logged.has(e.id)).length;
      setLocal(bkey, logged.size ? null : before);
    }
    setLocal(ANSWERS, [...finderAnswers().slice(-499), { at: Date.now(), id: ex.id, right }]);
    if (!right) logMistake({ source: 'finder', kind: `pattern:${ex.answer}`, label: `${ex.title}: picked ${p ? FINDER_BY_ID[p]?.name ?? p : 'nothing'}`, ref: ex.id });
    setS((x) => {
      let ids = x.ids, retries = x.retries;
      if (!right) {
        // Missed it: a different problem with the same pattern comes back in 3 questions, and this one again at the end.
        const later = new Set(ids.slice(x.pos + 1));
        const sibling = shuffle([...queue, ...ORIGINAL_DRILLS].filter((q) => q.answer === ex.answer && q.id !== ex.id && !ids.includes(q.id)))[0];
        ids = [...ids];
        if (sibling) { ids.splice(Math.min(ids.length, x.pos + 4), 0, sibling.id); retries = [...retries, sibling.id]; }
        if (!later.has(ex.id)) { ids.push(ex.id); retries = [...retries, ex.id]; }
      }
      return { ...x, ids, retries, pick: p, elapsed: took, log: [...x.log, { id: ex.id, title: ex.title, secs: took, right, pick: p, retry: x.retries.includes(ex.id) }] };
    });
  };

  const next = () => {
    if (s.pos + 1 >= s.ids.length) {
      setLocal(DONE, [...finderSessionsDone().slice(-99), Date.now()]);
      setS((x) => ({ ...x, summary: true }));
      return;
    }
    goTo({ pos: s.pos + 1 });
  };
  const newSession = () => { const f = fresh(filterId, queue, progress, true); start.current = Date.now(); setSecs(0); setS(f); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (summary) { if (e.key === 'Enter') { e.preventDefault(); newSession(); } return; }
      if (!running) { if (e.key === 'Enter') { e.preventDefault(); start.current = Date.now() - s.elapsed * 1000; setS((x) => ({ ...x, running: true })); } return; }
      if (done) { if (e.key === 'Enter') { e.preventDefault(); next(); } return; }
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) finish(options[n - 1]);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const stats = finderStats(progress);

  if (summary) {
    const batch = log;
    const right = batch.filter((x) => x.right).length;
    const avg = batch.reduce((a, x) => a + x.secs, 0) / Math.max(1, batch.length);
    const onPace = target ? batch.filter((x) => x.secs <= target).length : batch.length;
    const slow = [...batch].sort((a, b) => b.secs - a.secs).filter((x) => target && x.secs > target);
    const fixed = batch.filter((x) => x.retry && x.right).length;
    const verdict = right / batch.length >= 0.8 && (!target || onPace / batch.length >= 0.8)
      ? 'Interview ready on these. Try a tighter target next.'
      : right / batch.length < 0.6 ? 'Accuracy first: reread the lessons for the ones you missed before worrying about speed.'
      : 'Getting there. Speed comes from spotting the clue words, so reread the clue for your slowest ones.';
    return (
      <div className="mx-auto max-w-2xl space-y-5">
      <Card className="p-7">
        <h2 className="text-2xl font-bold text-zinc-100">Session report</h2>
        <p className="mt-1 text-zinc-400">{verdict}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-zinc-950 p-3"><div className="tnum text-2xl font-bold text-zinc-100">{right}/{batch.length}</div><div className="text-sm text-zinc-500">right</div></div>
          <div className="rounded-lg bg-zinc-950 p-3"><div className="tnum text-2xl font-bold text-zinc-100">{fmtS(avg)}</div><div className="text-sm text-zinc-500">average time</div></div>
          <div className="rounded-lg bg-zinc-950 p-3"><div className={`tnum text-2xl font-bold ${!target || onPace === batch.length ? 'text-emerald-300' : 'text-amber-300'}`}>{target ? `${onPace}/${batch.length}` : 'Off'}</div><div className="text-sm text-zinc-500">{target ? `within ${fmtS(target)}` : 'no target set'}</div></div>
        </div>
        {fixed > 0 && <p className="mt-3 text-sm text-emerald-300">You got {fixed} retr{fixed === 1 ? 'y' : 'ies'} right after missing the pattern earlier. That's the learning sticking.</p>}
        <h3 className="mb-2 mt-6 font-semibold text-zinc-100">Every question</h3>
        <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
          {batch.map((x, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2 text-[15px]">
              {x.right ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-rose-400" />}
              <span className="flex-1 text-zinc-200">{x.title}{x.retry && <span className="ml-2 text-xs text-zinc-500">retry</span>}</span>
              {!x.right && <span className="text-xs text-zinc-500">answer: {FINDER_BY_ID[BY_ID[x.id].answer].name}</span>}
              <span className={`tnum font-mono text-sm ${target && x.secs > target ? 'text-amber-300' : 'text-zinc-400'}`}>{fmtS(x.secs)}{target && x.secs > target ? ' over' : ''}</span>
            </li>
          ))}
        </ul>
        {slow.length > 0 && <p className="mt-3 text-sm text-zinc-400">Over target: {slow.map((x) => x.title).join(', ')}. In a real interview you have a minute or two to name the approach before you start coding.</p>}
        <div className="mt-6 flex gap-2">
          <Button onClick={newSession}>Next session <Kbd>Enter</Kbd></Button>
        </div>
      </Card>
      <WhereYouAre stats={stats} onLearn={onLearn} />
      </div>
    );
  }

  if (!ex) return null;

  if (!running) {
    const resuming = s.pos > 0 || s.log.length > 0;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
      <Card className="p-8 text-center">
        <Timer className="mx-auto mb-3 text-violet-400" size={28} />
        <h2 className="text-lg font-semibold text-zinc-100">{resuming ? 'Pick up where you left off' : 'Pattern finder'}</h2>
        <p className="mt-2 text-zinc-400">
          {resuming ? `You're on question ${s.pos + 1} of ${s.ids.length}, with ${s.log.filter((x) => x.right).length} of ${s.log.length} right so far.`
            : `Pick the pattern that gives the most efficient solution. A stopwatch tracks each answer but never cuts you off. Miss one and that pattern comes back a few questions later so it sticks. Your place is saved if you leave to read a lesson.`}
        </p>
        <p className="mt-4 text-sm font-medium text-zinc-300">Target time per question</p>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {TARGETS.map((t) => (
            <button key={t.s} onClick={() => { setTarget(t.s); localStorage.setItem('pyforge.finderTarget', String(t.s)); }}
              className={`rounded-full border px-3 py-1 text-sm ${target === t.s ? 'border-violet-500 bg-violet-500/10 text-zinc-100' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>{t.label}</button>
          ))}
        </div>
        <p className="mt-3 text-sm text-zinc-500">{queue.length} problems unlocked · keys <Kbd>1</Kbd>–<Kbd>4</Kbd></p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={() => { start.current = Date.now() - s.elapsed * 1000; setS((x) => ({ ...x, running: true })); }}><Play size={15} />{resuming ? 'Continue' : 'Start'} <Kbd>Enter</Kbd></Button>
          {resuming && <Button variant="ghost" onClick={newSession}><RotateCcw size={14} />New session</Button>}
        </div>
      </Card>
      <WhereYouAre stats={stats} onLearn={onLearn} />
      </div>
    );
  }

  const answered = s.log.length;
  const rightCount = s.log.filter((x) => x.right).length;
  const isRetry = s.retries.includes(ex.id);
  const justMissed = done && pick !== ex.answer;

  const right = pick === ex.answer;
  const ans = FINDER_BY_ID[ex.answer];
  const picked = pick ? FINDER_BY_ID[pick] : null;
  const lesson = ans.lesson ? LESSON_BY_ID[ans.lesson] : undefined;
  const optCls = (id: string) =>
    !done ? 'border-zinc-800 text-zinc-200 hover:border-violet-500'
      : id === ex.answer ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
      : id === pick ? 'border-rose-500/60 bg-rose-500/10 text-rose-200' : 'border-zinc-800 text-zinc-500';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-violet-500 transition-all" style={{ width: `${((s.pos + (done ? 1 : 0)) / s.ids.length) * 100}%` }} /></div>
      <div className="mb-3 flex items-center justify-between text-sm text-zinc-500">
        <span className="tnum">Question {s.pos + 1} of {s.ids.length}{isRetry ? ' · retry of a pattern you missed' : ''}</span>
        <span className="tnum">{rightCount} of {answered} right · {stats.seen}/{stats.total} problems seen overall</span>
      </div>
      {target > 0 && !done && (
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div className={`h-full transition-[width] duration-200 ${secs <= target * 0.75 ? 'bg-emerald-500' : secs <= target ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(1, secs / target) * 100}%` }} />
        </div>
      )}

      <Card className="p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <DiffTag d={ex.difficulty} />
          {ex.id.startsWith('orig-') ? <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-xs text-violet-200">Original problem · in the style of {ex.companies.map((c) => COMPANY_NAME[c]).join(', ')}</span> : <CompanyTags ids={ex.companies} />}
          <span className={`tnum ml-auto font-mono text-sm ${target && secs > target ? 'text-rose-300' : 'text-zinc-300'}`}>{fmtS(secs)}{target ? ` / ${fmtS(target)}` : ''}</span>
        </div>
        <h3 className="text-xl font-semibold text-zinc-100">{ex.title}</h3>
        <p className="mt-2 text-[17px] leading-relaxed text-zinc-200">{ex.statement}</p>
        <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-300"><span className="text-zinc-500">Example: </span>{ex.example}</div>
        <p className="mt-2 font-mono text-sm text-sky-300">Constraints: {ex.constraints}</p>
      </Card>

      <h4 className="mb-2 mt-5 text-lg font-semibold text-zinc-100">Which pattern gives the most efficient solution?</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((id, i) => (
          <button key={id} onClick={() => finish(id)} disabled={done}
            className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left text-[15px] transition-colors ${optCls(id)}`}>
            <Kbd>{i + 1}</Kbd>{FINDER_BY_ID[id].name}
          </button>
        ))}
      </div>

      {done && (
        <Card className="mt-5 p-5">
          <p className="mb-4 flex flex-wrap items-center gap-2 font-medium">
            {right ? <><CheckCircle2 size={18} className="text-emerald-400" /><span className="text-emerald-300">Right.</span></>
              : <><XCircle size={18} className="text-rose-400" /><span className="text-rose-300">Not this one.</span></>}
            <span className="text-zinc-300">The best fit is <span className="hl font-semibold text-zinc-100">{ans.name}</span>.</span>
          </p>
          {justMissed && <p className="mb-4 rounded-md border border-violet-500/30 px-3 py-2 text-sm text-zinc-300">Saved to your tracker. Another {ans.name.toLowerCase()} problem comes up in a few questions, and this one again at the end of the session, so you practice spotting it until it sticks.</p>}
          <div className="space-y-4 text-[15px] leading-relaxed">
            <Sec t="The clue in the problem">{ex.clue}</Sec>
            <Sec t="The obvious approach">{ex.brute}</Sec>
            <Sec t={`How ${ans.name.toLowerCase()} solves it`}>{ex.insight} <span className="whitespace-nowrap font-mono text-sm text-sky-300">{ex.optimal}</span></Sec>
            {picked && !right && (
              <Sec t={`Why not ${picked.name.toLowerCase()}?`} warn>
                {ex.whyNot?.[picked.id] ?? `${picked.name} fits when ${picked.fitsWhen}. This problem doesn't have that shape, so it would be slower than needed or give wrong answers.`}
              </Sec>
            )}
            {ex.followUp && <Sec t="What interviewers ask next">{ex.followUp}</Sec>}
          </div>
          {lesson && !right && <Template code={lesson.template} name={lesson.name} />}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={next}>Next<Kbd>Enter</Kbd></Button>
            {lesson && onLearn && <Button variant="subtle" onClick={() => onLearn(lesson.id)}><BookOpen size={15} />{right ? 'Review' : 'Learn'} {lesson.name}</Button>}
            {ex.nc && <a href={`https://neetcode.io/problems/${ex.nc}`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-violet-300 hover:underline">Solve it on NeetCode</a>}
          </div>
        </Card>
      )}
    </div>
  );
}

function Sec({ t, children, warn }: { t: string; children: React.ReactNode; warn?: boolean }) {
  return (
    <div className={warn ? 'rounded-md border border-rose-500/30 bg-rose-500/5 px-4 py-3' : ''}>
      <h5 className="font-semibold text-zinc-100">{t}</h5>
      <p className="text-zinc-300">{children}</p>
    </div>
  );
}

function Template({ code, name }: { code: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button onClick={() => setOpen(!open)} className="text-sm font-medium text-violet-300 hover:underline">{open ? 'Hide' : 'Show'} the {name.toLowerCase()} template</button>
      {open && <pre className="mt-2 overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed">{code.split('\n').map((line, i) => <div key={i}>{line ? highlight(line, `t${i}`) : ' '}</div>)}</pre>}
    </div>
  );
}

function WhereYouAre({ stats, onLearn }: { stats: ReturnType<typeof finderStats>; onLearn?: (id: string) => void }) {
  if (!stats.tries) return null;
  const rows = stats.rows.filter((r) => r.tries > 0).sort((a, b) => a.acc - b.acc);
  const notYet = stats.rows.filter((r) => r.tries === 0);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-semibold text-zinc-100">Where you are</h3>
        <span className="tnum text-sm text-zinc-400">{stats.seen}/{stats.total} problems seen · {Math.round(stats.acc * 100)}% right</span>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => {
          const l = FINDER_BY_ID[r.id]?.lesson;
          return (
            <li key={r.id} className="grid grid-cols-[1fr_90px_110px] items-center gap-3 text-sm">
              <span className="text-zinc-200">{r.name} <span className="text-xs text-zinc-500">{r.right}/{r.tries}</span></span>
              <Bar value={r.acc} color={r.acc >= 0.8 ? 'bg-emerald-500' : r.acc >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'} />
              <span className="text-right text-xs">{r.acc >= 0.8 ? <span className="text-emerald-400">strong</span> : l && onLearn ? <button className="link" onClick={() => onLearn(l)}>{r.acc < 0.5 ? 'relearn it' : 'review lesson'}</button> : <span className="text-amber-300">shaky</span>}</span>
            </li>
          );
        })}
      </ul>
      {notYet.length > 0 && <p className="mt-3 text-xs text-zinc-500">Not seen yet: {notYet.map((r) => r.name).join(', ')}</p>}
      <p className="mt-2 text-xs text-zinc-500">Each session starts with problems you missed, then reviews that are due, then your weakest patterns.</p>
    </Card>
  );
}

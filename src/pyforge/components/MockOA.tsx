import { CheckCircle2, Circle, Clock, FlaskConical, Loader2, Play, Send, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OA_FORMATS, pickProblems, type OAFormat } from '../data/oaFormats';
import { OA_PROBLEMS } from '../data/oaProblems';
import { highlight } from '../lib/highlight';
import { runTests, warmUp, type RunResult } from '../lib/pyrunner';
import { getLocal, setLocal } from '../lib/storage';
import type { OAProblem } from '../types';
import { Button, Card, Kbd, PageTitle } from './ui';
import CodeEditor from './CodeEditor';

interface Attempt { formatId: string; at: number; minutes: number; usedSec: number; problems: { id: string; passed: number; total: number; sec: number }[] }
const HIST = 'pyforge.oa.history';
const BEST = 'pyforge.oa.best';
const KIND_LABEL: Record<OAProblem['kind'], string> = { debug: 'Debugging', code: 'Coding', build: 'Build' };
const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

export default function MockOA() {
  const [session, setSession] = useState<{ format: OAFormat; problems: OAProblem[] } | null>(null);
  const [report, setReport] = useState<{ attempt: Attempt; problems: OAProblem[]; code: Record<string, string>; finals: Record<string, RunResult> } | null>(null);
  const history = getLocal<Attempt[]>(HIST, []);
  const best = getLocal<Record<string, number>>(BEST, {});

  useEffect(() => { warmUp().catch(() => {}); }, []); // start downloading Python early

  if (report) return <Report {...report} onBack={() => setReport(null)} />;
  if (session) return <Session key={session.problems.map((p) => p.id).join()} {...session} onDone={(r) => { setSession(null); setReport(r); }} onQuit={() => setSession(null)} />;

  const start = (f: OAFormat) => setSession({ format: f, problems: pickProblems(f, best) });
  const practice = (p: OAProblem) => setSession({ format: { id: 'practice', name: p.title, blurb: '', basis: '', minutes: 0, pick: [] }, problems: [p] });

  return (
    <div>
      <PageTitle sub="Timed online assessments with real Python running in your browser. Write or fix the code, run the sample tests, then submit against hidden tests, just like HackerRank. You get a full report at the end.">Mock OA</PageTitle>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {OA_FORMATS.map((f) => {
          const last = history.filter((h) => h.formatId === f.id).slice(-1)[0];
          return (
            <Card key={f.id} className="flex flex-col p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-zinc-100">{f.name}</h3>
                <span className="tnum flex shrink-0 items-center gap-1 whitespace-nowrap text-sm text-zinc-400"><Clock size={14} />{f.minutes} min</span>
              </div>
              <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-zinc-300">{f.blurb}</p>
              <p className="mt-2 text-xs text-zinc-500">Based on: {f.basis}</p>
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={() => start(f)}><Play size={15} />Start</Button>
                {last && <span className="tnum text-sm text-zinc-500">Last: {last.problems.reduce((a, p) => a + p.passed, 0)}/{last.problems.reduce((a, p) => a + p.total, 0)} tests</span>}
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 mt-10 text-xl font-semibold text-zinc-100">Practice one problem, no time limit</h2>
      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
        {[
          { label: 'Real work bugs', list: OA_PROBLEMS.filter((p) => p.kind === 'debug' && p.tags?.includes('real-world')) },
          { label: 'Classic debugging', list: OA_PROBLEMS.filter((p) => p.kind === 'debug' && !p.tags?.includes('real-world')) },
          { label: 'Coding', list: OA_PROBLEMS.filter((p) => p.kind === 'code') },
          { label: 'Build', list: OA_PROBLEMS.filter((p) => p.kind === 'build') },
        ].map(({ label, list }) => (
          <div key={label}>
            <h3 className="mb-2 font-medium text-zinc-300">{label} <span className="text-sm text-zinc-500">({list.length})</span></h3>
            <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800 bg-zinc-900">
              {list.map((p) => (
                <li key={p.id}>
                  <button onClick={() => practice(p)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[15px] hover:bg-zinc-950/50">
                    {best[p.id] === 1 ? <CheckCircle2 size={15} className="shrink-0 text-emerald-400" /> : best[p.id] ? <Circle size={15} className="shrink-0 text-amber-400" /> : <Circle size={15} className="shrink-0 text-zinc-600" />}
                    <span className="flex-1 text-zinc-200">{p.title}</span>
                    <span className={`text-xs ${p.difficulty === 'easy' ? 'text-emerald-400' : p.difficulty === 'medium' ? 'text-amber-400' : 'text-rose-400'}`}>{p.difficulty}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {history.length > 0 && (
        <p className="mt-6 text-sm text-zinc-500">{history.length} assessment{history.length === 1 ? '' : 's'} taken. Your last few are listed with each format above.</p>
      )}
    </div>
  );
}

function Session({ format, problems, onDone, onQuit }: { format: OAFormat; problems: OAProblem[]; onDone: (r: NonNullable<Parameters<typeof Report>[0]> & object) => void; onQuit: () => void }) {
  const timed = format.minutes > 0;
  const [idx, setIdx] = useState(0);
  const [code, setCode] = useState<Record<string, string>>(() => Object.fromEntries(problems.map((p) => [p.id, p.starter])));
  const [results, setResults] = useState<Record<string, RunResult & { full?: boolean }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const startAt = useRef(Date.now());
  const spent = useRef<Record<string, number>>({});
  const lastSwitch = useRef(Date.now());
  const finishing = useRef(false);
  const p = problems[idx];
  const elapsed = (now - startAt.current) / 1000;
  const remaining = format.minutes * 60 - elapsed;

  const bank = useCallback(() => {
    const t = Date.now();
    spent.current[p.id] = (spent.current[p.id] ?? 0) + (t - lastSwitch.current) / 1000;
    lastSwitch.current = t;
  }, [p.id]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);

  const run = async (all: boolean) => {
    setBusy(all ? 'submit' : 'run');
    const n = all ? p.tests.length : p.visible;
    const r = await runTests(code[p.id], p.func, p.kind, p.tests.slice(0, n), p.expected.slice(0, n), p.cmp);
    setResults((x) => ({ ...x, [p.id]: { ...r, full: all } }));
    setBusy(null);
  };

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    bank();
    setBusy('finish');
    const finals: Record<string, RunResult> = {};
    for (const q of problems) finals[q.id] = await runTests(code[q.id], q.func, q.kind, q.tests, q.expected, q.cmp);
    const attempt: Attempt = {
      formatId: format.id, at: Date.now(), minutes: format.minutes, usedSec: Math.round((Date.now() - startAt.current) / 1000),
      problems: problems.map((q) => ({ id: q.id, passed: finals[q.id].results.filter((r) => r.ok).length, total: q.tests.length, sec: Math.round(spent.current[q.id] ?? 0) })),
    };
    setLocal(HIST, [...getLocal<Attempt[]>(HIST, []), attempt].slice(-50));
    const b = getLocal<Record<string, number>>(BEST, {});
    for (const q of attempt.problems) b[q.id] = Math.max(b[q.id] ?? 0, q.passed / q.total);
    setLocal(BEST, b);
    onDone({ attempt, problems, code, finals, onBack: () => {} });
  }, [bank, problems, code, format, onDone]);

  useEffect(() => { if (timed && remaining <= 0) finish(); }, [timed, remaining, finish]);

  const r = results[p.id];
  const switchTo = (i: number) => { bank(); setIdx(i); };
  const status = (q: OAProblem) => {
    const x = results[q.id];
    if (!x || !x.results.length) return 'none';
    return x.results.every((t) => t.ok) ? (x.full ? 'all' : 'samples') : 'fail';
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-5 flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <span className="font-semibold text-zinc-100">{format.name}</span>
        <span className={`tnum flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[15px] ${!timed ? 'text-zinc-300' : remaining < 60 ? 'bg-rose-500/15 text-rose-300' : remaining < 300 ? 'bg-amber-500/15 text-amber-300' : 'text-zinc-200'}`}>
          <Clock size={15} />{timed ? `${fmt(remaining)} left` : `${fmt(elapsed)} elapsed`}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={onQuit}>Quit</Button>
          <Button onClick={finish} disabled={busy === 'finish'}>{busy === 'finish' ? <><Loader2 size={15} className="animate-spin" />Grading</> : 'Finish and see report'}</Button>
        </div>
      </div>

      {problems.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {problems.map((q, i) => {
            const st = status(q);
            return (
              <button key={q.id} onClick={() => switchTo(i)}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${i === idx ? 'border-violet-500 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>
                {st === 'all' ? <CheckCircle2 size={14} className="text-emerald-400" /> : st === 'fail' ? <XCircle size={14} className="text-rose-400" /> : st === 'samples' ? <CheckCircle2 size={14} className="text-amber-400" /> : <Circle size={14} className="text-zinc-600" />}
                Q{i + 1} · {KIND_LABEL[q.kind]}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card className="self-start p-5">
          <p className="text-sm text-zinc-500">{KIND_LABEL[p.kind]} · {p.difficulty}</p>
          <h2 className="mt-0.5 text-xl font-semibold text-zinc-100">{p.title}</h2>
          {p.kind === 'debug' && <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200">This code runs but fails some tests. Find and fix the bug without rewriting the whole function.</p>}
          <p className="mt-3 whitespace-pre-line text-[15.5px] leading-relaxed text-zinc-200">{p.statement}</p>
          <h3 className="mb-1.5 mt-4 text-sm font-semibold text-zinc-300">Sample tests</h3>
          <div className="space-y-1.5">
            {p.tests.slice(0, p.visible).map((t, i) => (
              <div key={i} className="overflow-x-auto rounded-md bg-zinc-950 px-3 py-2 font-mono text-[12.5px] text-zinc-300">
                {p.kind === 'build'
                  ? (t as [string, unknown[]][]).map(([m, a], j) => <div key={j}>{m === '__init__' ? `obj = ${p.func}(${a.map((x) => JSON.stringify(x)).join(', ')})` : `obj.${m}(${a.map((x) => JSON.stringify(x)).join(', ')})  → ${JSON.stringify((p.expected[i] as unknown[])[j])}`}</div>)
                  : <>{p.func}({(t as unknown[]).map((x) => JSON.stringify(x)).join(', ')}) → {JSON.stringify(p.expected[i])}</>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">{p.tests.length - p.visible} more hidden tests run when you submit.</p>
        </Card>

        <div>
          <CodeEditor value={code[p.id]} onChange={(v) => setCode((c) => ({ ...c, [p.id]: v }))} onRun={() => run(false)} errorLine={r?.line ?? r?.results.find((x) => x.line)?.line} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="subtle" onClick={() => run(false)} disabled={!!busy}>{busy === 'run' ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}Run samples <Kbd>⌘ Enter</Kbd></Button>
            <Button onClick={() => run(true)} disabled={!!busy}>{busy === 'submit' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}Submit all tests</Button>
            <button onClick={() => setCode((c) => ({ ...c, [p.id]: p.starter }))} className="ml-auto text-sm text-zinc-500 hover:text-zinc-300">Reset code</button>
          </div>
          {busy && busy !== 'finish' && !r && <p className="mt-3 text-sm text-zinc-500">Starting Python the first time takes a few seconds…</p>}
          {r && <ResultsPanel r={r} p={p} />}
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({ r, p }: { r: RunResult & { full?: boolean }; p: OAProblem }) {
  if (r.loadError) return <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-200">{r.loadError}</p>;
  if (r.timeout) return <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-200">Time limit exceeded: your code ran for more than 8 seconds. Look for an infinite loop or a slower than needed approach.</p>;
  if (r.compileError) return <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/5 p-3 font-mono text-sm text-rose-200">{r.compileError}{r.line ? ` (line ${r.line})` : ''}</p>;
  const passed = r.results.filter((t) => t.ok).length;
  return (
    <Card className="mt-3 p-4">
      <p className={`mb-2 font-semibold ${passed === r.results.length ? 'text-emerald-300' : 'text-rose-300'}`}>
        {passed}/{r.results.length} {r.full ? 'tests' : 'sample tests'} passed{passed === r.results.length && !r.full ? '. Now submit to run the hidden tests.' : ''}
      </p>
      <ul className="space-y-1.5">
        {r.results.map((t, i) => {
          const hidden = i >= p.visible;
          return (
            <li key={i} className="rounded-md bg-zinc-950 px-3 py-2 text-[13px]">
              <span className={`font-medium ${t.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{t.ok ? 'Passed' : 'Failed'}</span>
              <span className="text-zinc-500"> · {hidden ? `Hidden test ${i + 1}` : `Sample ${i + 1}`}{t.ms != null ? ` · ${t.ms} ms` : ''}</span>
              {!t.ok && !hidden && (
                <div className="mt-1 font-mono text-zinc-300">
                  {t.error ? <div className="text-rose-300">{t.error}{t.line ? ` (line ${t.line})` : ''}</div> : <div>Got {t.got}, expected {t.expected}</div>}
                </div>
              )}
              {!t.ok && hidden && t.error && <div className="mt-1 font-mono text-rose-300">{t.error}</div>}
              {t.stdout && !hidden && <pre className="mt-1 whitespace-pre-wrap font-mono text-zinc-500">stdout: {t.stdout}</pre>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Report({ attempt, problems, code, finals, onBack }: { attempt: Attempt; problems: OAProblem[]; code: Record<string, string>; finals: Record<string, RunResult>; onBack: () => void }) {
  const passed = attempt.problems.reduce((a, p) => a + p.passed, 0);
  const total = attempt.problems.reduce((a, p) => a + p.total, 0);
  const solvedAll = attempt.problems.filter((p) => p.passed === p.total).length;
  const timed = attempt.minutes > 0;
  const onTime = !timed || attempt.usedSec <= attempt.minutes * 60;
  const perBudget = timed ? (attempt.minutes * 60) / problems.length : 0;
  const pct = total ? passed / total : 0;
  const verdict = pct === 1 ? 'Full marks. In a real OA this clears the bar.' : pct >= 0.8 ? 'Strong. Most real OAs pass you at this level, but chase the last hidden tests.' : pct >= 0.5 ? 'Borderline. Partial credit counts, but cutoffs are often higher.' : 'Below most cutoffs. Review the explanations below, then retake it.';

  return (
    <div className="max-w-4xl">
      <button onClick={onBack} className="mb-4 text-sm text-zinc-400 hover:text-zinc-100">Back to Mock OA</button>
      <PageTitle sub={verdict}>Your report</PageTitle>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="text-sm text-zinc-500">Tests passed</div><div className="tnum mt-1 text-3xl font-bold text-zinc-100">{passed}<span className="text-lg text-zinc-500">/{total}</span></div></Card>
        <Card className="p-5"><div className="text-sm text-zinc-500">Problems fully solved</div><div className="tnum mt-1 text-3xl font-bold text-zinc-100">{solvedAll}<span className="text-lg text-zinc-500">/{problems.length}</span></div></Card>
        <Card className="p-5"><div className="text-sm text-zinc-500">Time used</div><div className="tnum mt-1 text-3xl font-bold text-zinc-100">{fmt(attempt.usedSec)}</div>
          <div className={`mt-1 text-sm ${onTime ? 'text-emerald-400' : 'text-rose-400'}`}>{timed ? (onTime ? `Within the ${attempt.minutes} minute limit` : 'Ran out of time') : 'Untimed practice'}</div></Card>
      </div>

      <div className="space-y-5">
        {problems.map((p, i) => {
          const a = attempt.problems[i];
          const slow = timed && a.sec > perBudget * 1.25;
          const f = finals[p.id];
          return (
            <Card key={p.id} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-zinc-100">Q{i + 1}. {p.title} <span className="text-sm font-normal text-zinc-500">{KIND_LABEL[p.kind]}</span></h3>
                <span className={`tnum font-semibold ${a.passed === a.total ? 'text-emerald-300' : a.passed ? 'text-amber-300' : 'text-rose-300'}`}>{a.passed}/{a.total} tests</span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {code[p.id].trim() === p.starter.trim() ? <span className="text-rose-400">Not attempted. An untouched question scores nothing, so always leave a few minutes for a partial answer.</span>
                  : <>Time on it: {fmt(a.sec)}{timed && <> · budget about {fmt(perBudget)} <span className={slow ? 'text-rose-400' : 'text-emerald-400'}>{slow ? '(over budget, which costs you on later questions)' : '(on pace)'}</span></>}</>}
              </p>
              {f.compileError && <p className="mt-2 font-mono text-sm text-rose-300">{f.compileError}</p>}
              <div className="mt-3 rounded-md bg-zinc-900 px-4 py-3 text-[15px] leading-relaxed text-zinc-300">
                <span className="font-semibold text-zinc-100">{p.kind === 'debug' ? 'The bug: ' : 'How to solve it: '}</span>{p.explain}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-violet-300">Compare your code with a reference solution</summary>
                <div className="mt-2 grid gap-3 lg:grid-cols-2">
                  <Code title="Yours" src={code[p.id]} />
                  <Code title="Reference" src={p.solution} />
                </div>
              </details>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-zinc-500">Real OAs usually grade on hidden tests passed, so partial credit counts. Time per question is tracked only while that question is open.</p>
    </div>
  );
}

function Code({ title, src }: { title: string; src: string }) {
  const lines = useMemo(() => src.split('\n'), [src]);
  return (
    <div>
      <div className="mb-1 text-xs text-zinc-500">{title}</div>
      <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-[12.5px] leading-relaxed">{lines.map((l, i) => <div key={i}>{l ? highlight(l, `${title}${i}`) : ' '}</div>)}</pre>
    </div>
  );
}

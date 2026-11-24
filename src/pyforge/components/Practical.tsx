import { CheckCircle2, ChevronLeft, Circle, Clock, Eye, FileCode2, Lock, MessageSquare, Play, Send, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { COMPANY_NAME } from '../data/meta';
import { CODEBASES, PRACTICAL, type CodebaseRound, type PracticalProblem, type PracticalTest } from '../data/practical';
import { aiName } from '../lib/cloud';
import { logMistake } from '../lib/mistakes';
import { emptyRound, firstTryRate, joinFiles, nextRound, practicalMastery, practicalStore, saveRound, type RoundLog } from '../lib/practical';
import { runTests, warmUp, type RunResult } from '../lib/pyrunner';
import type { CompanyId } from '../types';
import { useSample } from './AI';
import CodeEditor from './CodeEditor';
import { Bar, Button, Card, PageTitle } from './ui';

/** JSON value -> how Python would print it. */
function py(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(py).join(', ')}]`;
  if (typeof v === 'object') return `{${Object.entries(v as Record<string, unknown>).map(([k, x]) => `${JSON.stringify(k)}: ${py(x)}`).join(', ')}}`;
  return String(v);
}
const pyStr = (s?: string) => { if (s === undefined) return ''; try { return py(JSON.parse(s)); } catch { return s; } };
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

function TestLines({ t, kind, func }: { t: PracticalTest; kind: string; func: string }) {
  if (kind === 'call') return <div className="font-mono text-[13px]"><span className="text-zinc-200">{func}({(t.args as unknown[]).map(py).join(', ')})</span> <span className="text-zinc-500">→ {py(t.expected)}</span></div>;
  const ops = t.args as [string, unknown[]][];
  const exp = t.expected as unknown[];
  return (
    <div className="font-mono text-[13px] leading-relaxed">
      {ops.map(([m, a], i) => (
        <div key={i}>
          <span className="text-zinc-200">{m === '__init__' ? `x = ${func}(${a.map(py).join(', ')})` : `x.${m}(${a.map(py).join(', ')})`}</span>
          {m !== '__init__' && exp[i] !== null && <span className="text-zinc-500">  → {py(exp[i])}</span>}
        </div>
      ))}
    </div>
  );
}

function Timer({ since, target }: { since: number; target: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const ms = Math.max(0, now - since);
  const over = ms > target * 60000;
  return <span className={`tnum inline-flex items-center gap-1 text-sm ${over ? 'text-amber-300' : 'text-zinc-400'}`}><Clock size={14} />{fmt(ms)} <span className="text-zinc-600">/ {target} min target</span></span>;
}

export default function Practical({ initial }: { initial?: string }) {
  const [sel, setSel] = useState<string | undefined>(initial && (PRACTICAL.some((p) => p.id === initial) || CODEBASES.some((c) => c.id === initial)) ? initial : undefined);
  const [, bump] = useState(0);
  useEffect(() => { warmUp(); }, []);
  const back = () => { setSel(undefined); bump((x) => x + 1); };
  const p = PRACTICAL.find((x) => x.id === sel);
  if (p) return <PartRound p={p} onBack={back} />;
  const c = CODEBASES.find((x) => x.id === sel);
  if (c) return <CodebaseView c={c} onBack={back} />;

  const store = practicalStore();
  const ft = firstTryRate();
  const nx = nextRound();
  const passed = (id: string) => (store[id]?.parts ?? []).filter((x) => x.passedAt).length;
  const Row = ({ id, title, n, minutes, companies }: { id: string; title: string; n: number; minutes: number; companies: string[] }) => {
    const k = passed(id);
    return (
      <li>
        <button onClick={() => setSel(id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-950/50">
          {k >= n ? <CheckCircle2 size={16} className="shrink-0 text-emerald-400" /> : <Circle size={16} className={`shrink-0 ${k ? 'text-amber-400' : 'text-zinc-600'}`} />}
          <span className="flex-1 text-[15px] text-zinc-200">{title}</span>
          <span className="hidden text-xs text-zinc-500 md:inline">{companies.slice(0, 3).map((x) => COMPANY_NAME[x as CompanyId] ?? x).join(', ')}</span>
          <span className="flex gap-1">{Array.from({ length: n }, (_, i) => <span key={i} className={`h-2 w-4 rounded-sm ${i < k ? 'bg-emerald-500' : 'bg-zinc-800'}`} />)}</span>
          <span className="tnum w-14 text-right text-xs text-zinc-500">~{minutes} m</span>
        </button>
      </li>
    );
  };

  return (
    <div className="max-w-5xl">
      <PageTitle sub="The rounds that are not plain LeetCode: a problem that grows with new requirements while the old tests must keep passing, and an unfamiliar codebase you fix, extend and speed up. Tests include hidden edge cases, like a real interviewer would try.">Practical rounds</PageTitle>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-zinc-500">Parts passed</div><div className="tnum mt-1 text-2xl font-semibold text-zinc-100">{ft.passed}</div><Bar value={practicalMastery()} /></Card>
        <Card className="p-4"><div className="text-xs text-zinc-500">Clean on first submit</div><div className="tnum mt-1 text-2xl font-semibold text-zinc-100">{ft.passed ? `${Math.round((ft.clean / ft.passed) * 100)}%` : 'none yet'}</div><p className="mt-1 text-xs text-zinc-500">Quant interviewers weigh code that works on the first or second try.</p></Card>
        <Card className="p-4"><div className="text-xs text-zinc-500">Next up</div><button onClick={() => setSel(nx.id)} className="link mt-1 text-left text-[15px]">{nx.title}, part {nx.partIndex + 1}</button></Card>
      </div>
      <section className="mb-6">
        <h3 className="font-semibold text-zinc-100">Multi-part class design</h3>
        <p className="mb-2 text-sm text-zinc-500">The Jane Street and Citadel shape: build part 1, then the interviewer adds a requirement. State the approach and its cost and list your edge cases before you type.</p>
        <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800 bg-zinc-900">{PRACTICAL.map((x) => <Row key={x.id} id={x.id} title={x.title} n={x.parts.length} minutes={x.minutes} companies={x.companies} />)}</ul>
      </section>
      <section>
        <h3 className="font-semibold text-zinc-100">Codebase rounds</h3>
        <p className="mb-2 text-sm text-zinc-500">The Meta AI-enabled and Google code comprehension shape: a small project you did not write, then fix bugs, add a feature, and make it fast in 60 minutes. You can ask {aiName() ?? 'an AI'} questions, but you have to check what it says.</p>
        <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800 bg-zinc-900">{CODEBASES.map((x) => <Row key={x.id} id={x.id} title={x.title} n={x.phases.length} minutes={x.minutes} companies={x.companies} />)}</ul>
      </section>
    </div>
  );
}

function Results({ r, labels, err }: { r: RunResult | null; labels: { label: string; hidden: boolean; part?: number }[]; err?: string }) {
  if (!r) return null;
  if (r.loadError) return <p className="text-sm text-amber-300">Python could not load: {r.loadError}</p>;
  if (r.timeout) return <p className="text-sm text-amber-300">Timed out. Something loops forever or is far too slow for the input size.</p>;
  if (r.compileError) return <p className="font-mono text-sm text-rose-300">{r.compileError}{err ? ` (${err})` : r.line ? ` (line ${r.line})` : ''}</p>;
  return (
    <ul className="space-y-1.5">
      {r.results.map((x, i) => (
        <li key={i} className="text-sm">
          <div className="flex gap-2"><span className={x.ok ? 'text-emerald-400' : 'text-rose-400'}>{x.ok ? '✓' : '✗'}</span>
            <span className={x.ok ? 'text-zinc-400' : 'text-zinc-100'}>{labels[i]?.part !== undefined ? `Part ${labels[i].part! + 1}: ` : ''}{labels[i]?.label || `Test ${i + 1}`}</span></div>
          {!x.ok && <div className="ml-5 font-mono text-[12.5px] text-zinc-400">{x.error ? <span className="text-rose-300">{x.error}{x.line ? ` (line ${x.line})` : ''}</span> : <>got {pyStr(x.got)}<br />want {pyStr(x.expected)}</>}</div>}
        </li>
      ))}
    </ul>
  );
}

function PartRound({ p, onBack }: { p: PracticalProblem; onBack: () => void }) {
  const [log, setLog] = useState<RoundLog>(() => { const s = practicalStore()[p.id]; return s && s.parts.length === p.parts.length ? s : { ...emptyRound(p.parts.length), ...(s ?? {}), parts: emptyRound(p.parts.length).parts }; });
  const firstOpen = log.parts.findIndex((x) => !x.passedAt);
  const [idx, setIdx] = useState(firstOpen === -1 ? p.parts.length - 1 : firstOpen);
  const [code, setCode] = useState(log.code ?? p.starter + '\n');
  const [res, setRes] = useState<RunResult | null>(null);
  const [labels, setLabels] = useState<{ label: string; hidden: boolean; part?: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [since, setSince] = useState(Date.now());
  const [approach, setApproach] = useState(log.parts[idx]?.approach ?? '');
  const [edges, setEdges] = useState(log.parts[idx]?.edges ?? '');
  const [review, setReview] = useState(log.review ?? '');
  const [reviewing, setReviewing] = useState(false);
  const sample = useSample();
  const part = p.parts[idx];
  const pl = log.parts[idx];
  const allDone = log.parts.every((x) => x.passedAt);
  const save = (n: RoundLog) => { setLog(n); saveRound(p.id, n); };
  useEffect(() => { setApproach(log.parts[idx]?.approach ?? ''); setEdges(log.parts[idx]?.edges ?? ''); setRes(null); setSince(Date.now()); }, [idx]);  
  useEffect(() => { const t = setTimeout(() => saveRound(p.id, { ...log, code, startedAt: log.startedAt ?? Date.now() }), 600); return () => clearTimeout(t); }, [code]);  
  const planned = approach.trim().split(/\s+/).filter(Boolean).length >= 6 && edges.trim().length >= 3;

  const run = async (submit: boolean) => {
    setBusy(true);
    const scope = submit ? p.parts.slice(0, idx + 1).flatMap((pp, k) => pp.tests.map((t) => ({ t, pp, k }))) : part.tests.filter((t) => !t.hidden).map((t) => ({ t, pp: part, k: idx }));
    // one runner call per function name keeps the harness simple
    const groups = new Map<string, typeof scope>();
    for (const s of scope) { const key = `${s.pp.func}|${s.pp.kind}`; groups.set(key, [...(groups.get(key) ?? []), s]); }
    let merged: RunResult = { results: [] };
    const order: typeof scope = [];
    for (const [key, items] of groups) {
      const [func, kind] = key.split('|');
      const r = await runTests(code, func, kind === 'build' ? 'build' : 'call', items.map((x) => x.t.args), items.map((x) => x.t.expected), 'exact');
      if (r.compileError || r.timeout || r.loadError) { merged = r; order.length = 0; break; }
      merged.results.push(...r.results); order.push(...items);
    }
    setLabels(order.map((x) => ({ label: x.t.label, hidden: x.t.hidden, part: submit ? x.k : undefined })));
    setRes(merged);
    const ok = !merged.compileError && !merged.timeout && !merged.loadError && merged.results.length > 0 && merged.results.every((x) => x.ok);
    const parts = [...log.parts];
    const cur = { ...parts[idx], approach, edges };
    if (submit) {
      cur.submits++;
      if (ok && !cur.passedAt) { cur.passedAt = Date.now(); cur.firstTry = cur.submits === 1; cur.ms = Date.now() - since; }
      if (!ok) {
        const failed = order.filter((_, i) => !merged.results[i]?.ok).map((x) => x.t.label).slice(0, 3);
        logMistake({ source: 'practical', kind: `practical:${p.id}`, label: failed.join('; ') || 'error on submit', ref: p.id });
      }
    } else cur.runs++;
    parts[idx] = cur;
    save({ ...log, code, parts, startedAt: log.startedAt ?? Date.now() });
    setBusy(false);
  };

  const askReview = async () => {
    if (!sample) return;
    setReviewing(true);
    try {
      const prompt = `You are a strict senior engineer at a quant firm reviewing a new grad's interview code. The problem had these parts:\n${p.parts.map((x, i) => `${i + 1}. ${x.prompt}`).join('\n')}\n\nTheir final code:\n${code}\n\nGive a short, direct review in plain text (no markdown headers): 1) correctness risks or edge cases still missing, 2) data structure choice and the complexity of each method, 3) readability, naming and structure as an interviewer would grade it, 4) one concrete improvement to practice. Under 180 words.`;
      const out = await sample(prompt, { cache: false });
      setReview(out.text.trim());
      save({ ...log, code, review: out.text.trim() });
    } catch { setReview('The review failed. Try again in a moment.'); }
    setReviewing(false);
  };

  return (
    <div className="flex w-full flex-col lg:h-[calc(100vh-4rem)]">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"><ChevronLeft size={15} />Practical rounds</button>
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">{p.title}</h2>
        {!pl.passedAt && <Timer since={since} target={Math.round(p.minutes / p.parts.length)} />}
        <div className="ml-auto flex gap-1">
          {p.parts.map((_, i) => {
            const open = i === 0 || log.parts[i - 1].passedAt;
            return <button key={i} disabled={!open} onClick={() => setIdx(i)} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-sm ${i === idx ? 'bg-violet-600 text-white' : open ? 'border border-zinc-800 text-zinc-300 hover:border-zinc-600' : 'text-zinc-600'}`}>{!open && <Lock size={12} />}{log.parts[i].passedAt && <CheckCircle2 size={13} />}Part {i + 1}</button>;
          })}
        </div>
      </div>
      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-4 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pb-6">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-100">Part {idx + 1}: {part.title}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-zinc-300">{part.prompt}</p>
            <div className="mt-3 space-y-2 rounded-md bg-zinc-950 p-3">
              <div className="text-xs text-zinc-500">Examples (hidden tests check more)</div>
              {part.tests.filter((t) => !t.hidden).map((t, i) => <TestLines key={i} t={t} kind={part.kind} func={part.func} />)}
            </div>
            {idx > 0 && <p className="mt-2 text-xs text-zinc-500">Submitting also re-runs every test from earlier parts. Extending your code must not break them.</p>}
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-100">Before you type</h3>
            <p className="mb-2 text-xs text-zinc-500">Interviewers grade this out loud: name the data structures and the cost of each method, then the cases you will test. Submit unlocks once both are filled in.</p>
            <textarea value={approach} onChange={(e) => setApproach(e.target.value)} rows={3} placeholder="Approach and complexity. e.g. dict of price to deque for FIFO, heap per side for best price, add O(log n)…" className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500" />
            <textarea value={edges} onChange={(e) => setEdges(e.target.value)} rows={3} placeholder="Edge cases you will check, one per line" className="mt-2 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500" />
          </Card>
          {pl.passedAt && (
            <Card className="border-emerald-500/40 p-4">
              <div className="font-semibold text-emerald-300">Part {idx + 1} passed{pl.firstTry ? ' on the first submit' : ` after ${pl.submits} submits`}{pl.ms ? ` in ${fmt(pl.ms)}` : ''}</div>
              <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                <div><div className="text-xs text-zinc-500">Edge cases you listed</div><pre className="mt-1 whitespace-pre-wrap font-sans text-zinc-300">{pl.edges || 'none'}</pre></div>
                <div><div className="text-xs text-zinc-500">What interviewers look for</div><ul className="mt-1 list-disc space-y-0.5 pl-4 text-zinc-300">{part.edges.map((e) => <li key={e}>{e}</li>)}</ul></div>
              </div>
              {idx < p.parts.length - 1 && <Button className="mt-3" onClick={() => setIdx(idx + 1)}>Next part: {p.parts[idx + 1].title}</Button>}
            </Card>
          )}
          {allDone && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-zinc-100">Follow-up questions to answer out loud</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-300">{p.followups.map((q) => <li key={q}>{q}</li>)}</ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {sample && <Button variant="subtle" onClick={askReview} disabled={reviewing}><Sparkles size={14} />{reviewing ? 'Reviewing…' : `${aiName()} code review`}</Button>}
                <Button variant="ghost" onClick={() => save({ ...log, solutionSeen: true })}><Eye size={14} />Compare with a reference solution</Button>
              </div>
              {review && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{review}</p>}
              {log.solutionSeen && <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-zinc-950 p-3 font-mono text-[12.5px] text-zinc-300">{p.reference}</pre>}
            </Card>
          )}
          <p className="text-xs text-zinc-500">{p.source}</p>
        </div>
        <div className="min-w-0 space-y-3 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pb-6">
          <CodeEditor value={code} onChange={setCode} onRun={() => run(false)} errorLine={res?.line ?? res?.results.find((x) => x.line)?.line} minRows={22} />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="subtle" onClick={() => run(false)} disabled={busy}><Play size={14} />Run examples</Button>
            <Button onClick={() => run(true)} disabled={busy || !planned} title={planned ? '' : 'Fill in your approach and edge cases first'}><Send size={14} />{busy ? 'Running…' : `Submit part ${idx + 1}`}</Button>
            <span className="text-xs text-zinc-500">{pl.submits ? `${pl.submits} submit${pl.submits > 1 ? 's' : ''}` : 'Aim to pass on the first submit'}{pl.runs ? ` · ${pl.runs} example runs` : ''}</span>
          </div>
          <Results r={res} labels={labels} />
        </div>
      </div>
    </div>
  );
}

function CodebaseView({ c, onBack }: { c: CodebaseRound; onBack: () => void }) {
  const [log, setLog] = useState<RoundLog>(() => { const s = practicalStore()[c.id]; return s && s.parts.length === c.phases.length ? s : emptyRound(c.phases.length); });
  const [files, setFiles] = useState<Record<string, string>>(() => log.files ?? Object.fromEntries(c.files.map((f) => [f.name, f.code])));
  const [tab, setTab] = useState(c.files[0].name);
  const firstOpen = log.parts.findIndex((x) => !x.passedAt);
  const [idx, setIdx] = useState(firstOpen === -1 ? c.phases.length - 1 : firstOpen);
  const [res, setRes] = useState<RunResult | null>(null);
  const [labels, setLabels] = useState<{ label: string; hidden: boolean; part?: number }[]>([]);
  const [errAt, setErrAt] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [since] = useState(() => log.startedAt ?? Date.now());
  const [q, setQ] = useState('');
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [asking, setAsking] = useState(false);
  const [showSol, setShowSol] = useState(false);
  const [armed, setArmed] = useState(false);
  const sample = useSample();
  const chatEnd = useRef<HTMLDivElement>(null);
  const save = (n: RoundLog) => { setLog(n); saveRound(c.id, n); };
  useEffect(() => { const t = setTimeout(() => saveRound(c.id, { ...log, files, startedAt: since }), 600); return () => clearTimeout(t); }, [files]);  
  const joined = useMemo(() => joinFiles(c.files.map((f) => ({ name: f.name, code: files[f.name] })), c.harness), [files, c]);
  const ph = c.phases[idx];
  const allDone = log.parts.every((x) => x.passedAt);

  const run = async () => {
    setBusy(true);
    const scope = c.phases.slice(0, idx + 1).flatMap((p, k) => p.tests.map((t) => ({ t, k })));
    const r = await runTests(joined.src, '_pyforge_case', 'call', scope.map((x) => [x.t.name]), scope.map((x) => x.t.expected), 'exact', 15000);
    const w = joined.where(r.line ?? r.results.find((x) => x.line)?.line);
    setErrAt(w ? `${w.file} line ${w.line}` : undefined);
    if (w) setTab(w.file);
    setLabels(scope.map((x) => ({ label: x.t.label, hidden: false, part: x.k })));
    setRes(r);
    const ok = !r.compileError && !r.timeout && !r.loadError && r.results.length > 0 && r.results.every((x) => x.ok);
    const parts = [...log.parts];
    const cur = { ...parts[idx], submits: parts[idx].submits + 1 };
    if (ok && !cur.passedAt) { cur.passedAt = Date.now(); cur.firstTry = cur.submits === 1; cur.ms = Date.now() - since; }
    if (!ok) logMistake({ source: 'practical', kind: `practical:${c.id}`, label: `${ph.title}: ${scope.filter((_, i) => !r.results[i]?.ok).map((x) => x.t.label)[0] ?? 'error'}`, ref: c.id });
    parts[idx] = cur;
    save({ ...log, files, parts, startedAt: since });
    setBusy(false);
  };

  const ask = async () => {
    if (!sample || !q.trim()) return;
    setAsking(true);
    const question = q.trim();
    setQ('');
    try {
      const ctx = c.files.map((f) => `# ${f.name}\n${files[f.name]}`).join('\n\n');
      const history = chat.slice(-4).map((m) => `Candidate: ${m.q}\nAssistant: ${m.a}`).join('\n');
      const prompt = `You are the AI assistant inside a timed coding interview, like Meta's AI-enabled round. Answer the candidate's question about this codebase briefly and concretely. You may be wrong sometimes, like a real assistant; do not refuse. Current task: ${ph.task}\n\nCodebase:\n${ctx}\n\n${history}\nCandidate: ${question}\nAssistant:`;
      const out = await sample(prompt, { cache: false });
      setChat((h) => [...h, { q: question, a: out.text.trim() }]);
      save({ ...log, files, aiAsks: (log.aiAsks ?? 0) + 1 });
    } catch { setChat((h) => [...h, { q: question, a: 'The assistant failed to answer. Try again.' }]); }
    setAsking(false);
    setTimeout(() => chatEnd.current?.scrollIntoView({ block: 'nearest' }), 50);
  };

  return (
    <div className="flex w-full flex-col lg:h-[calc(100vh-4rem)]">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"><ChevronLeft size={15} />Practical rounds</button>
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">{c.title}</h2>
        {!allDone && <Timer since={since} target={c.minutes} />}
        <div className="ml-auto flex gap-1">
          {c.phases.map((x, i) => {
            const open = i === 0 || log.parts[i - 1].passedAt;
            return <button key={i} disabled={!open} onClick={() => { setIdx(i); setRes(null); }} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-sm ${i === idx ? 'bg-violet-600 text-white' : open ? 'border border-zinc-800 text-zinc-300 hover:border-zinc-600' : 'text-zinc-600'}`}>{!open && <Lock size={12} />}{log.parts[i].passedAt && <CheckCircle2 size={13} />}{i + 1}. {x.title}</button>;
          })}
        </div>
      </div>
      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="min-w-0 space-y-3 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pb-6">
          <div className="flex flex-wrap gap-1 border-b border-zinc-800">
            {c.files.map((f) => <button key={f.name} onClick={() => setTab(f.name)} className={`flex items-center gap-1.5 rounded-t-md px-3 py-1.5 font-mono text-sm ${tab === f.name ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}><FileCode2 size={13} />{f.name}</button>)}
          </div>
          <CodeEditor value={files[tab]} onChange={(v) => setFiles((fs) => ({ ...fs, [tab]: v }))} onRun={run} minRows={24} errorLine={errAt?.startsWith(tab) ? Number(errAt.split(' line ')[1]) : undefined} />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={run} disabled={busy}><Play size={14} />{busy ? 'Running…' : `Run tests for steps 1 to ${idx + 1}`}</Button>
            <Button variant="ghost" onClick={() => { if (armed) { setFiles(Object.fromEntries(c.files.map((x) => [x.name, x.code]))); setArmed(false); } else { setArmed(true); setTimeout(() => setArmed(false), 3000); } }}>{armed ? 'Click again to reset every file' : 'Reset files'}</Button>
          </div>
          <Results r={res} labels={labels} err={errAt} />
        </div>
        <div className="min-w-0 space-y-4 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pb-6">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-100">Step {idx + 1}: {ph.title}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-zinc-300">{ph.task}</p>
            <ul className="mt-2 space-y-0.5 text-sm text-zinc-400">{ph.tests.map((t) => <li key={t.name}>· {t.label}</li>)}</ul>
            {log.parts[idx].passedAt && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <p className="text-sm text-emerald-300">Step passed{log.parts[idx].firstTry ? ' on the first run' : ''}.</p>
                {idx < c.phases.length - 1 && <Button className="mt-2" onClick={() => { setIdx(idx + 1); setRes(null); }}>Next: {c.phases[idx + 1].title}</Button>}
              </div>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100"><MessageSquare size={14} />AI assistant</h3>
            <p className="mb-2 text-xs text-zinc-500">Like the real round: use it to read code faster or draft boilerplate, but verify every answer. It can be wrong. Interviewers grade how you check its output, not how often you ask.</p>
            {!sample ? <p className="text-sm text-zinc-500">{sample === undefined ? 'Connecting…' : 'Add a Gemini or Claude key under Stats to use the assistant.'}</p> : (
              <>
                <div className="max-h-72 space-y-3 overflow-y-auto">
                  {chat.map((m, i) => <div key={i} className="text-sm"><div className="text-zinc-400">You: {m.q}</div><div className="mt-1 whitespace-pre-wrap text-zinc-200">{m.a}</div></div>)}
                  <div ref={chatEnd} />
                </div>
                <div className="mt-2 flex gap-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(); }} placeholder="e.g. what does low_stock return for qty == threshold?" className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-violet-500" />
                  <Button variant="subtle" onClick={ask} disabled={asking || !q.trim()}>{asking ? '…' : 'Ask'}</Button>
                </div>
              </>
            )}
          </Card>
          {allDone && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-zinc-100">Debrief out loud</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-300">{c.followups.map((x) => <li key={x}>{x}</li>)}</ul>
              <Button variant="ghost" className="mt-2" onClick={() => setShowSol(!showSol)}><Eye size={14} />{showSol ? 'Hide' : 'Compare with'} a reference fix</Button>
              {showSol && c.solution.map((f) => <div key={f.name} className="mt-2"><div className="font-mono text-xs text-zinc-500">{f.name}</div><pre className="max-h-72 overflow-auto rounded-md bg-zinc-950 p-3 font-mono text-[12.5px] text-zinc-300">{f.code}</pre></div>)}
            </Card>
          )}
          <p className="text-xs text-zinc-500">{c.source}</p>
        </div>
      </div>
    </div>
  );
}

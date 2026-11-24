import { CheckCircle2, ChevronLeft, Circle, Copy, ExternalLink, GitBranch, Lock, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { LAB, LAB_BY_ID, TRACKS, type LabTask, type TrackId } from '../data/lab';
import { aiName } from '../lib/cloud';
import { getLocal, setLocal, today } from '../lib/storage';
import { useSample } from './AI';
import { Bar, Button, Card, PageTitle } from './ui';

const KEY = 'pyforge.lab';
interface TaskState { steps?: boolean[]; reflection?: string; review?: Review; doneAt?: number }
interface Review { ok: boolean; score: number; feedback: string; gaps: string[]; followups: string[]; byAI?: boolean }
interface LabState { repo: string; scan?: { at: number; paths: string[]; error?: string }; ci?: { at: number; conclusion: string | null }; tasks: Record<string, TaskState>; activity?: string[] }

export const labState = (): LabState => getLocal<LabState>(KEY, { repo: 'Surya0901/swe-lab', tasks: {} });
const saveLab = (s: LabState) => setLocal(KEY, s);

export type LabStatus = 'done' | 'built' | 'started' | 'new';
export function taskStatus(t: LabTask, s: LabState): LabStatus {
  const ts = s.tasks[t.id];
  const paths = s.scan?.paths ?? [];
  const built = t.checks.every((c) => paths.some((p) => c.path.test(p))) && (!t.ci || s.ci?.conclusion === 'success');
  if (built && ts?.review?.ok) return 'done';
  if (built) return 'built';
  if (ts?.steps?.some(Boolean) || t.checks.some((c) => paths.some((p) => c.path.test(p))) || ts?.reflection) return 'started';
  return 'new';
}
export function nextLabTask(s = labState()): LabTask {
  const st = (t: LabTask) => taskStatus(t, s);
  return LAB.find((t) => st(t) !== 'done' && (t.needs ?? []).every((n) => st(LAB_BY_ID[n]) === 'done' || st(LAB_BY_ID[n]) === 'built')) ?? LAB.find((t) => st(t) !== 'done') ?? LAB[LAB.length - 1];
}
export const labTouchedToday = () => (labState().activity ?? []).includes(today());
const touch = (s: LabState): LabState => ({ ...s, activity: [...new Set([...(s.activity ?? []).slice(-60), today()])] });

/** Reads the file list of your swe-lab repo from GitHub's public API. */
async function scanRepo(repo: string) {
  const r = await fetch(`https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`, { headers: { Accept: 'application/vnd.github+json' } });
  if (r.status === 404) throw new Error(`Couldn't find github.com/${repo}. Create it (public) in task 1, or fix the name.`);
  if (r.status === 403) throw new Error('GitHub rate limit hit (60 checks an hour without login). Try again in a bit.');
  if (r.status === 409) return [] as string[]; // empty repo
  if (!r.ok) throw new Error(`GitHub said ${r.status}.`);
  const j = (await r.json()) as { tree?: { type: string; path: string }[]; workflow_runs?: { conclusion: string | null }[] };
  return (j.tree ?? []).filter((x: { type: string }) => x.type === 'blob').map((x: { path: string }) => x.path as string);
}
async function ciStatus(repo: string) {
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`);
  if (!r.ok) return null;
  const j = (await r.json()) as { tree?: { type: string; path: string }[]; workflow_runs?: { conclusion: string | null }[] };
  return (j.workflow_runs?.[0]?.conclusion as string | null) ?? null;
}

const STATUS: Record<LabStatus, [string, string]> = {
  done: ['Done', 'text-emerald-300'],
  built: ['Built, reflect to finish', 'text-amber-300'],
  started: ['In progress', 'text-violet-300'],
  new: ['Not started', 'text-zinc-500'],
};

export default function Lab({ initial }: { initial?: string }) {
  const [s, setS] = useState<LabState>(labState);
  const [sel, setSel] = useState<string | undefined>(initial && LAB_BY_ID[initial] ? initial : undefined);
  const [busy, setBusy] = useState(false);
  const [repoDraft, setRepoDraft] = useState(s.repo);
  const update = (n: LabState) => { setS(n); saveLab(n); };

  const scan = async (repo = s.repo) => {
    setBusy(true);
    try {
      const [paths, ci]: [string[], string | null] = await Promise.all([scanRepo(repo), ciStatus(repo)]);
      const n = { ...s, repo, scan: { at: Date.now(), paths }, ci: { at: Date.now(), conclusion: ci } };
      const grew = s.scan && repo === s.repo && paths.some((p) => !s.scan!.paths.includes(p));
      update(grew ? touch(n) : n); // new files pushed since last check count as lab work today
    } catch (e) {
      update({ ...s, repo, scan: { at: Date.now(), paths: s.scan?.paths ?? [], error: (e as Error).message } });
    }
    setBusy(false);
  };
  useEffect(() => { if (!s.scan || Date.now() - s.scan.at > 10 * 60_000) scan(); }, []);  

  const status = useMemo(() => Object.fromEntries(LAB.map((t) => [t.id, taskStatus(t, s)])) as Record<string, LabStatus>, [s]);
  const done = LAB.filter((t) => status[t.id] === 'done').length;
  const next = nextLabTask(s);

  const t = sel ? LAB_BY_ID[sel] : undefined;
  if (t) return <TaskView t={t} s={s} status={status[t.id]} update={update} onBack={() => setSel(undefined)} onScan={() => scan()} busy={busy} />;

  return (
    <div className="max-w-5xl">
      <PageTitle sub="Hands-on builds on your own laptop: cloud, AI engineering and the engineering basics teams expect. Everything goes in one GitHub repo, pyforge checks it, and you reflect on what you learned so it sticks and turns into interview answers.">Build lab</PageTitle>

      <div className="mb-6 grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-1 font-semibold text-zinc-100">How it works</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-300">
            <li>Do a task on your laptop and push it to your <span className="font-mono">swe-lab</span> repo, in the task's folder.</li>
            <li>pyforge reads the repo from GitHub and ticks off what's there.</li>
            <li>Answer the reflection questions. {aiName() ? `${aiName()} reviews them and asks you interview follow-ups.` : 'They are checked for depth.'}</li>
            <li>Done tasks give you resume bullets and interview stories you can actually defend.</li>
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
            <GitBranch size={15} className="text-zinc-500" />
            <input value={repoDraft} onChange={(e) => setRepoDraft(e.target.value)} className="w-56 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-sm text-zinc-100 outline-none focus:border-violet-500" aria-label="GitHub repo" />
            <Button variant="ghost" onClick={() => scan(repoDraft.trim())} disabled={busy}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />{busy ? 'Checking…' : 'Check repo'}</Button>
          </div>
          <p className={`mt-1 text-xs ${s.scan?.error ? 'text-amber-300' : 'text-zinc-500'}`}>{s.scan?.error ?? (s.scan ? `${s.scan.paths.length} files found · checked ${new Date(s.scan.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${s.ci?.conclusion ? ` · latest CI run: ${s.ci.conclusion}` : ''}` : 'Not checked yet')}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-baseline justify-between"><h3 className="font-semibold text-zinc-100">Your progress</h3><span className="tnum text-sm text-zinc-400">{done}/{LAB.length} done</span></div>
          <ul className="mt-3 space-y-2">
            {(Object.keys(TRACKS) as TrackId[]).map((id) => {
              const ts = LAB.filter((x) => x.track === id);
              const v = ts.reduce((a, x) => a + (status[x.id] === 'done' ? 1 : status[x.id] === 'built' ? 0.7 : status[x.id] === 'started' ? 0.25 : 0), 0) / ts.length;
              return (
                <li key={id} className="grid grid-cols-[1fr_90px_36px] items-center gap-2 text-sm">
                  <span className="text-zinc-300">{TRACKS[id].name}</span>
                  <Bar value={v} color={v >= 0.8 ? 'bg-emerald-500' : 'bg-violet-500'} />
                  <span className="tnum text-right text-xs text-zinc-500">{Math.round(v * 100)}%</span>
                </li>
              );
            })}
          </ul>
          <button onClick={() => setSel(next.id)} className="link mt-4 text-sm">Next up: {next.n}. {next.title}</button>
        </Card>
      </div>

      {(Object.keys(TRACKS) as TrackId[]).map((id) => (
        <section key={id} className="mb-6">
          <h3 className="font-semibold text-zinc-100">{TRACKS[id].name}</h3>
          <p className="mb-2 text-sm text-zinc-500">{TRACKS[id].blurb}</p>
          <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800 bg-zinc-900">
            {LAB.filter((x) => x.track === id).map((x) => {
              const stx = status[x.id];
              const blocked = (x.needs ?? []).filter((n) => status[n] === 'new' || status[n] === 'started');
              return (
                <li key={x.id}>
                  <button onClick={() => setSel(x.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-950/50">
                    {stx === 'done' ? <CheckCircle2 size={16} className="shrink-0 text-emerald-400" /> : blocked.length ? <Lock size={15} className="shrink-0 text-zinc-600" /> : <Circle size={16} className={`shrink-0 ${stx === 'new' ? 'text-zinc-600' : 'text-amber-400'}`} />}
                    <span className="tnum w-6 text-xs text-zinc-500">{x.n}</span>
                    <span className="flex-1 text-[15px] text-zinc-200">{x.title}</span>
                    <span className="hidden text-xs text-zinc-500 sm:inline">{blocked.length ? `after ${blocked.map((b) => LAB_BY_ID[b].n).join(', ')}` : ''}</span>
                    <span className={`text-xs ${STATUS[stx][1]}`}>{STATUS[stx][0]}</span>
                    <span className="tnum w-14 text-right text-xs text-zinc-500">~{x.mins >= 120 ? `${Math.round(x.mins / 60)} h` : `${x.mins} m`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TaskView({ t, s, status, update, onBack, onScan, busy }: { t: LabTask; s: LabState; status: LabStatus; update: (s: LabState) => void; onBack: () => void; onScan: () => void; busy: boolean }) {
  const ts = s.tasks[t.id] ?? {};
  const paths = s.scan?.paths ?? [];
  const [refl, setRefl] = useState(ts.reflection ?? t.reflect.map((q) => `${q}\n\n`).join('\n'));
  const [reviewing, setReviewing] = useState(false);
  const [showQ, setShowQ] = useState(false);
  const [copied, setCopied] = useState(false);
  const sample = useSample();
  const setTask = (patch: Partial<TaskState>) => update(touch({ ...s, tasks: { ...s.tasks, [t.id]: { ...ts, ...patch } } }));
  const steps = ts.steps ?? t.build.map(() => false);
  const built = t.checks.every((c) => paths.some((p) => c.path.test(p))) && (!t.ci || s.ci?.conclusion === 'success');

  const review = async () => {
    setReviewing(true);
    let r: Review | null = null;
    if (sample) {
      try {
        const prompt = `You are a senior software engineer mentoring a new grad. They just finished a hands-on task and wrote a reflection. Grade it for real understanding, not length.\n\nTask: ${t.title}\nWhat they built: ${t.build.join(' ')}\nTheir reflection:\n${refl}\n\nReply with only JSON: {"score":1-5,"ok":true if score>=3,"feedback":"2-3 plain sentences: what they clearly understand, what is shaky or wrong, and exactly what to read or try","gaps":["short concept they should firm up"],"followups":["3 interview-style follow-up questions an interviewer would ask about this project, specific to what they wrote"]}`;
        const out = await sample(prompt, { cache: false });
        const j = JSON.parse(out.text.slice(out.text.indexOf('{'), out.text.lastIndexOf('}') + 1));
        r = { ok: !!j.ok, score: Number(j.score) || 0, feedback: String(j.feedback ?? ''), gaps: j.gaps ?? [], followups: j.followups ?? [], byAI: true };
      } catch { r = null; }
    }
    if (!r) {
      // Offline: every question needs a real answer (25+ words under it)
      const parts = refl.split(new RegExp(t.reflect.map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'))).slice(1);
      const thin = t.reflect.filter((_, i) => (parts[i] ?? '').trim().split(/\s+/).filter(Boolean).length < 25);
      r = { ok: thin.length === 0, score: thin.length ? 2 : 4, feedback: thin.length ? 'Answer every question in at least a few sentences, in your own words, as if explaining to an interviewer.' : 'Every question has a real answer. Add an AI key under Stats for a deeper review with interview follow-ups.', gaps: thin, followups: t.interview };
    }
    setTask({ reflection: refl, review: r, doneAt: r.ok && built ? Date.now() : ts.doneAt });
    setReviewing(false);
  };

  return (
    <div className="max-w-6xl">
      <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"><ChevronLeft size={15} />Build lab</button>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">{t.n}. {t.title}</h2>
        <span className="text-sm text-zinc-500">{TRACKS[t.track].name} · about {t.mins >= 120 ? `${Math.round(t.mins / 60)} hours` : `${t.mins} minutes`}</span>
        <span className={`text-sm ${STATUS[status][1]}`}>{STATUS[status][0]}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="p-4"><h3 className="mb-1 text-sm font-semibold text-zinc-100">Why this matters</h3><p className="text-[15px] text-zinc-300">{t.why}</p>
            {t.needs?.length ? <p className="mt-2 text-xs text-zinc-500">Builds on: {t.needs.map((n) => `${LAB_BY_ID[n].n}. ${LAB_BY_ID[n].title}`).join('; ')}</p> : null}
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">Build it (folder <span className="font-mono">{t.folder}/</span>)</h3>
            <ol className="space-y-2">
              {t.build.map((b, i) => (
                <li key={i} className="flex gap-2.5">
                  <input type="checkbox" checked={!!steps[i]} onChange={() => setTask({ steps: steps.map((x, k) => (k === i ? !x : x)) })} className="mt-1 h-4 w-4 accent-violet-500" />
                  <span className={`text-[15px] ${steps[i] ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{b}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-zinc-100">Learn from</h3>
            <ul className="space-y-1.5 text-sm">{t.learn.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">{l.label}<ExternalLink size={12} /></a></li>)}</ul>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-zinc-100">Checked in {s.repo}</h3>
              <button onClick={onScan} disabled={busy} className="flex items-center gap-1 text-sm text-violet-300 hover:underline"><RefreshCw size={13} className={busy ? 'animate-spin' : ''} />{busy ? 'Checking…' : 'Check now'}</button></div>
            <ul className="space-y-1 text-sm">
              {t.checks.map((c) => { const ok = paths.some((p) => c.path.test(p)); return <li key={c.label} className="flex gap-2"><span className={ok ? 'text-emerald-400' : 'text-zinc-600'}>{ok ? '✓' : '○'}</span><span className={ok ? 'text-zinc-400' : 'text-zinc-200'}>{c.label}</span></li>; })}
              {t.ci && <li className="flex gap-2"><span className={s.ci?.conclusion === 'success' ? 'text-emerald-400' : 'text-zinc-600'}>{s.ci?.conclusion === 'success' ? '✓' : '○'}</span><span className="text-zinc-200">latest GitHub Actions run is green{s.ci?.conclusion && s.ci.conclusion !== 'success' ? ` (now: ${s.ci.conclusion})` : ''}</span></li>}
            </ul>
            {s.scan?.error && <p className="mt-2 text-xs text-amber-300">{s.scan.error}</p>}
            <p className="mt-2 text-xs text-zinc-500">Push your work, then Check now. The repo must be public.</p>
          </Card>
          <Card className="p-4">
            <h3 className="mb-1 text-sm font-semibold text-zinc-100">Reflect</h3>
            <p className="mb-2 text-xs text-zinc-500">Answer under each question in your own words, like you're explaining it in an interview. This is what makes it stick.</p>
            <textarea value={refl} onChange={(e) => setRefl(e.target.value)} rows={12} className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-[14px] leading-relaxed text-zinc-100 outline-none focus:border-violet-500" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button onClick={review} disabled={reviewing}><Sparkles size={14} />{reviewing ? 'Reviewing…' : aiName() ? `Get ${aiName()}'s review` : 'Check my reflection'}</Button>
              {!built && <span className="text-xs text-zinc-500">Finishes once the repo checks pass too.</span>}
            </div>
            {ts.review && (
              <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${ts.review.ok ? 'border-emerald-500/40' : 'border-amber-500/40'}`}>
                <div className="flex justify-between"><span className={ts.review.ok ? 'font-semibold text-emerald-300' : 'font-semibold text-amber-300'}>{ts.review.ok ? 'Solid understanding' : 'Not there yet'}</span><span className="text-xs text-zinc-500">{ts.review.byAI ? `${aiName()} · ${ts.review.score}/5` : 'auto-check'}</span></div>
                <p className="mt-1 text-zinc-200">{ts.review.feedback}</p>
                {ts.review.gaps.length > 0 && <p className="mt-1 text-xs text-amber-200">Firm up: {ts.review.gaps.join('; ')}</p>}
                {ts.review.byAI && ts.review.followups.length > 0 && (
                  <div className="mt-2"><div className="text-xs font-medium text-zinc-400">Interview follow-ups on your project:</div><ul className="mt-1 list-disc space-y-0.5 pl-5 text-zinc-300">{ts.review.followups.map((q) => <li key={q}>{q}</li>)}</ul></div>
                )}
              </div>
            )}
          </Card>
          <Card className="p-4">
            <button onClick={() => setShowQ(!showQ)} className="text-sm font-semibold text-zinc-100">{showQ ? '▾' : '▸'} Interview questions on this topic</button>
            {showQ && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-300">{t.interview.map((q) => <li key={q}>{q}</li>)}</ul>}
            {t.resume && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <div className="text-xs text-zinc-500">{status === 'done' ? 'Resume bullet (earned):' : 'Resume bullet once this is done:'}</div>
                <div className="mt-1 flex items-start gap-2"><p className={`flex-1 text-sm ${status === 'done' ? 'text-zinc-100' : 'text-zinc-500'}`}>{t.resume}</p>
                  {status === 'done' && <button onClick={() => { navigator.clipboard?.writeText(t.resume!); setCopied(true); }} className="text-zinc-400 hover:text-zinc-100" aria-label="Copy"><Copy size={14} /></button>}</div>
                {copied && <p className="text-xs text-emerald-300">Copied</p>}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

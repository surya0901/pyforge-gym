import { Check, ExternalLink, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ALL } from '../data';
import { lessonCoverage } from '../lib/coverage';
import { isUnlocked, lessonsFor, nodeName, roadmapStatus, ROADMAP, solvedDrillIds, type NodeStatus } from '../lib/roadmap';
import type { Mode, PatternId, Progress } from '../types';
import { Bar, Button, Card, PageTitle } from './ui';

interface Props {
  progress: Progress;
  solved: Set<string>;
  unlockAll: boolean;
  setUnlockAll: (v: boolean) => void;
  open: (m: Mode, opts?: { pattern?: PatternId | 'all'; company?: 'all' }) => void;
  onLearn: (lessonId: string) => void;
}

const ROW_H = 104;

export default function Roadmap({ progress, solved, unlockAll, setUnlockAll, open, onLearn }: Props) {
  const status = useMemo(() => roadmapStatus(progress, solved), [progress, solved]);
  const firstOpen = ROADMAP.find((n) => status[n.id].state === 'open')?.id ?? 'arrays';
  const [sel, setSel] = useState<PatternId>(firstOpen);
  const done = ROADMAP.filter((n) => status[n.id].state === 'done').length;
  const rows = Math.max(...ROADMAP.map((n) => n.row)) + 1;
  const height = rows * ROW_H;

  return (
    <div>
      <PageTitle sub="Patterns open in NeetCode's order. A pattern is complete when you've solved half of its NeetCode 150 problems, and that opens the ones below it. Its drills unlock as soon as you read its lesson or solve one of its problems.">Roadmap</PageTitle>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="text-zinc-300"><span className="tnum font-semibold text-zinc-100">{done}</span> of {ROADMAP.length} patterns complete · <span className="tnum font-semibold text-zinc-100">{solved.size}</span>/150 solved</span>
        <span className="flex items-center gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500" />Complete</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-violet-500" />Open</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-zinc-700" />Locked</span>
        </span>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input type="checkbox" checked={unlockAll} onChange={(e) => setUnlockAll(e.target.checked)} className="accent-violet-500" />
          Unlock every drill (free practice)
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-x-auto p-4">
          <div className="relative mx-auto min-w-[760px]" style={{ height }}>
            <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
              {ROADMAP.flatMap((n) => n.parents.map((pid) => {
                const p = ROADMAP.find((x) => x.id === pid)!;
                const lit = status[pid].state === 'done';
                const y1 = p.row * ROW_H + 62, y2 = n.row * ROW_H + 14;
                const same = p.row === n.row;
                return (
                  <path key={`${pid}-${n.id}`} vectorEffect="non-scaling-stroke"
                    d={same ? `M ${p.x} ${p.row * ROW_H + 38} L ${n.x} ${n.row * ROW_H + 38}` : `M ${p.x} ${y1} C ${p.x} ${(y1 + y2) / 2}, ${n.x} ${(y1 + y2) / 2}, ${n.x} ${y2}`}
                    fill="none" strokeWidth={lit ? 2 : 1.5} strokeDasharray={lit ? undefined : '4 4'}
                    className={lit ? 'stroke-emerald-500/70' : 'stroke-zinc-600'} />
                );
              }))}
            </svg>
            {ROADMAP.map((n) => {
              const st = status[n.id];
              const isSel = sel === n.id;
              const cls = st.state === 'done' ? 'border-emerald-500 bg-emerald-500/10'
                : st.state === 'open' ? 'border-violet-500 bg-zinc-900' : 'border-zinc-800 bg-zinc-950 opacity-70';
              return (
                <button key={n.id} onClick={() => setSel(n.id)} style={{ left: `clamp(0px, calc(${n.x}% - 84px), calc(100% - 168px))`, top: n.row * ROW_H + 14 }}
                  className={`absolute w-[168px] rounded-lg border-2 px-3 py-2 text-left transition ${cls} ${isSel ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950' : 'hover:brightness-110'}`}>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight text-zinc-100">
                    {st.state === 'locked' && <Lock size={12} className="shrink-0 text-zinc-500" />}
                    {st.state === 'done' && <Check size={13} className="shrink-0 text-emerald-400" />}
                    <span className="truncate">{nodeName(n.id)}</span>
                  </span>
                  {st.problems.length > 0 && (
                    <>
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-zinc-800"><span className={`block h-full ${st.state === 'done' ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${(st.solved / st.problems.length) * 100}%` }} /></span>
                      <span className="tnum mt-1 block text-[11px] text-zinc-500">{st.solved}/{st.problems.length} solved</span>
                    </>
                  )}
                  {!st.problems.length && <span className="mt-1 block text-[11px] text-zinc-500">pyforge drills</span>}
                </button>
              );
            })}
          </div>
        </Card>

        <Detail st={status[sel]} status={status} progress={progress} solved={solved} unlockAll={unlockAll} open={open} onLearn={onLearn} pick={setSel} />
      </div>
    </div>
  );
}

function Detail({ st, status, progress, solved, unlockAll, open, onLearn, pick }: {
  st: NodeStatus; status: Record<PatternId, NodeStatus>; progress: Progress; solved: Set<string>; unlockAll: boolean;
  open: Props['open']; onLearn: Props['onLearn']; pick: (id: PatternId) => void;
}) {
  const viaSolved = useMemo(() => solvedDrillIds(solved, ALL), [solved]);
  const items = ALL.filter((e) => e.pattern === st.node.id);
  const count = (kind: string) => {
    const of = items.filter((e) => e.kind === kind);
    return { total: of.length, open: unlockAll ? of.length : of.filter((e) => isUnlocked(e, status, viaSolved)).length };
  };
  const drills = [
    { kind: 'syntax', label: 'Syntax recall', mode: 'syntax' as Mode },
    { kind: 'bug', label: 'Bug hunter', mode: 'bug' as Mode },
    { kind: 'pattern', label: 'Pattern finder', mode: 'pattern' as Mode },
  ].map((d) => ({ ...d, ...count(d.kind) })).filter((d) => d.total > 0);
  const lessons = lessonsFor(st.node.id);
  const remaining = Math.max(0, st.need - st.solved);

  return (
    <Card className="self-start p-5 xl:sticky xl:top-6">
      <p className="text-sm text-zinc-500">{st.state === 'done' ? 'Complete' : st.state === 'open' ? 'Open' : 'Locked'}</p>
      <h2 className="text-2xl font-bold tracking-tight text-zinc-100">{nodeName(st.node.id)}</h2>

      {st.state === 'locked' ? (
        <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-[15px]">
          <p className="font-medium text-zinc-200">To unlock, complete:</p>
          <ul className="mt-1.5 space-y-1.5">
            {st.blockers.map((b) => (
              <li key={b}><button onClick={() => pick(b)} className="text-left text-violet-300 hover:underline">{nodeName(b)}</button>
                <span className="text-zinc-500"> · {status[b].state === 'locked' ? 'still locked itself' : `${status[b].solved}/${status[b].need} of the needed problems solved`}</span></li>
            ))}
          </ul>
        </div>
      ) : st.problems.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-sm"><span className="text-zinc-300">{st.state === 'done' ? 'Complete. Keep going for mastery.' : `Solve ${remaining} more to complete`}</span><span className="tnum text-zinc-500">{st.solved}/{st.problems.length}</span></div>
          <Bar value={st.solved / st.problems.length} color={st.state === 'done' ? 'bg-emerald-500' : 'bg-violet-500'} />
        </div>
      )}

      {lessons.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 font-semibold text-zinc-100">Learn it</h3>
          <div className="space-y-2">
            {lessons.map((l) => {
              const cov = lessonCoverage(l, progress, solved);
              return (
                <button key={l.id} onClick={() => onLearn(l.id)} className="block w-full rounded-md border border-zinc-800 px-3 py-2 text-left hover:border-violet-500">
                  <span className="flex justify-between text-[15px]"><span className="text-zinc-100">{l.name}</span><span className="tnum text-sm text-zinc-500">{Math.round(cov.score * 100)}%</span></span>
                  <span className="text-sm text-zinc-500">{cov.opened ? (cov.learned ? 'Learned' : 'Opened, finish the quick check') : 'Not read yet. Reading it unlocks the drills.'}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h3 className="mb-2 font-semibold text-zinc-100">Drills</h3>
        <div className="space-y-2">
          {drills.map((d) => (
            <div key={d.kind} className="flex items-center gap-3">
              <span className="flex-1 text-[15px] text-zinc-300">{d.label} <span className="tnum text-sm text-zinc-500">{d.open}/{d.total} unlocked</span></span>
              <Button variant="subtle" className="!px-2.5 !py-1 text-sm" disabled={!d.open} onClick={() => open(d.mode, { pattern: st.node.id, company: 'all' })}>
                {d.open ? 'Practice' : <><Lock size={12} />Locked</>}
              </Button>
            </div>
          ))}
          {!drills.length && <p className="text-sm text-zinc-500">No drills for this pattern yet.</p>}
        </div>
        {!unlockAll && !st.drillsOpen && <p className="mt-2 text-sm text-zinc-500">Read a lesson above or solve one problem below to unlock these.</p>}
      </section>

      {st.problems.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 font-semibold text-zinc-100">NeetCode problems</h3>
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {st.problems.map((p) => (
              <li key={p.slug} className="flex items-center gap-2 text-[15px]">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${solved.has(p.slug) ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-600'}`}>{solved.has(p.slug) && <Check size={10} strokeWidth={3} />}</span>
                <a href={p.url} target="_blank" rel="noreferrer" className={`flex-1 truncate hover:underline ${solved.has(p.slug) ? 'text-zinc-500' : 'text-zinc-200'}`}>{p.name}</a>
                <span className={`text-xs ${p.difficulty === 'Easy' ? 'text-emerald-400' : p.difficulty === 'Medium' ? 'text-amber-400' : 'text-rose-400'}`}>{p.difficulty}</span>
                <ExternalLink size={12} className="text-zinc-600" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}

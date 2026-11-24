import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { COMPANIES, COMPANY_NAME } from '../data/meta';
import { allPrep, trackPrep, type Prep } from '../lib/prep';
import type { CompanyId, Mode, PatternId, Progress } from '../types';
import { Bar, Card } from './ui';

interface Props {
  progress: Progress;
  solved: Set<string>;
  targets: CompanyId[];
  open: (m: Mode, opts?: { company?: CompanyId | 'all'; pattern?: PatternId | 'all' }) => void;
  onLearn: (lessonId?: string) => void;
}

/** How prepared you are for each target company, what moved this week, and the one thing that would raise it most. */
export default function CompanyTracker({ progress, solved, targets, open, onLearn }: Props) {
  const prep = useMemo(() => allPrep(progress, solved), [progress, solved]);
  const hist = useMemo(() => trackPrep(prep), [prep]);
  const ids = (targets.length ? targets : COMPANIES.map((c) => c.id)).slice();
  const rows = ids.map((id) => prep[id]).sort((a, b) => b.overall - a.overall);
  const [openId, setOpenId] = useState<CompanyId | null>(null);
  const avg = rows.reduce((a, r) => a + r.overall, 0) / Math.max(1, rows.length);

  const act = (r: Prep, key: string) => {
    if (key === 'patterns') return onLearn();
    if (key === 'finder') return open('pattern', { company: r.id, pattern: 'all' });
    if (key === 'oa') return open('oa');
    return open('companies', { company: r.id });
  };

  return (
    <Card className="p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-100">How prepared you are</h3>
        <span className="text-sm text-zinc-400">{targets.length ? `Your ${targets.length} target${targets.length === 1 ? '' : 's'}` : 'All companies'} · average <span className="tnum font-semibold text-zinc-100">{Math.round(avg * 100)}%</span></span>
      </div>
      <p className="mb-4 text-sm text-zinc-500">Counts their NeetCode problems you've solved, the patterns they ask, pattern spotting on their problems, the rounds their loop tests, and timed OAs. Updates as you practice.</p>
      <ul className="divide-y divide-zinc-800">
        {rows.map((r) => {
          const d = hist.delta(r.id);
          const isOpen = openId === r.id;
          return (
            <li key={r.id} className="py-2.5">
              <button onClick={() => setOpenId(isOpen ? null : r.id)} className="grid w-full grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-left">
                <span className="truncate font-medium text-zinc-100">{COMPANY_NAME[r.id]}</span>
                <span><Bar value={r.overall} color={r.overall >= 0.8 ? 'bg-emerald-500' : r.overall >= 0.35 ? 'bg-violet-500' : 'bg-zinc-500'} /></span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="tnum w-10 text-right font-semibold text-zinc-100">{Math.round(r.overall * 100)}%</span>
                  <span className={`tnum w-12 text-right text-xs ${d && d > 0.004 ? 'text-emerald-400' : 'text-zinc-500'}`}>{d == null ? '' : d > 0.004 ? `+${Math.round(d * 100)} wk` : '±0 wk'}</span>
                  <ChevronDown size={15} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
              <div className="mt-0.5 text-xs text-zinc-500">{r.level} · biggest lever: {r.next.label[0].toLowerCase() + r.next.label.slice(1)}</div>
              {isOpen && (
                <div className="mt-3 space-y-2.5 rounded-md bg-zinc-950 p-3">
                  {r.parts.map((p) => (
                    <div key={p.key} className="grid grid-cols-[1fr_80px] items-center gap-3">
                      <div>
                        <div className="text-sm text-zinc-200">{p.label} <span className="text-xs text-zinc-500">{Math.round(p.weight * 100)}% of the score</span></div>
                        <div className="text-xs text-zinc-500">{p.detail}</div>
                      </div>
                      <div><Bar value={p.value} /><div className="tnum mt-0.5 text-right text-xs text-zinc-400">{Math.round(p.value * 100)}%</div></div>
                    </div>
                  ))}
                  <button onClick={() => act(r, r.next.key)} className="link text-sm">Next best step: {r.next.action}</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {hist.since && hist.since !== new Date().toLocaleDateString('en-CA') ? null : <p className="mt-3 text-xs text-zinc-500">Weekly change shows up after a few days of tracking.</p>}
    </Card>
  );
}

import { CheckCircle2, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DESIGN_PROBLEMS } from '../data/design';
import { COMPANY_NAME } from '../data/meta';
import { getLocal, mastery, setLocal } from '../lib/storage';
import type { CompanyId, Progress } from '../types';
import { Button, Card, PageTitle } from './ui';

interface Props {
  progress: Progress;
  company: CompanyId | 'all';
  onResult: (id: string, quality: 0 | 1 | 2 | 3, tags: string[]) => void;
}

const NOTES_KEY = 'pyforge.design-notes.v1';

export default function DesignStudio({ progress, company, onResult }: Props) {
  const list = DESIGN_PROBLEMS.filter((d) => company === 'all' || d.companies.includes(company));
  const [id, setId] = useState(list[0]?.id ?? DESIGN_PROBLEMS[0].id);
  const prob = DESIGN_PROBLEMS.find((d) => d.id === id)!;
  const [notes, setNotes] = useState<Record<string, string>>(() => getLocal(NOTES_KEY, {}));
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [rated, setRated] = useState(false);
  useEffect(() => setLocal(NOTES_KEY, notes), [notes]);
  useEffect(() => { setShown(new Set()); setRated(false); }, [id]);

  const rate = (q: 0 | 1 | 2 | 3) => { onResult(prob.id, q, q === 0 ? ['design-miss'] : []); setRated(true); };

  return (
    <div>
      <PageTitle sub="Write your own answer for each step first, then compare with the reference. New grad design rounds reward a clear structure and honest trade-offs more than buzzwords.">System design studio</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <nav className="space-y-0.5 lg:sticky lg:top-24 lg:self-start">
          {list.map((d) => {
            const m = mastery(progress.cards[d.id]);
            return (
              <button key={d.id} onClick={() => setId(d.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors ${id === d.id ? 'bg-zinc-900 text-zinc-100 shadow-[inset_3px_0_0_rgb(var(--py-500))]' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}>
                <span>{d.title}</span>
                {m > 0 && <CheckCircle2 size={15} className={m > 0.6 ? 'text-emerald-400' : 'text-zinc-500'} />}
              </button>
            );
          })}
          {list.length === 0 && <p className="px-3 text-sm text-zinc-500">No design problems for this company filter.</p>}
        </nav>

        <div>
          <div className="mb-5">
            <h2 className="text-[28px] font-semibold leading-tight text-zinc-100">{prob.title}</h2>
            <p className="mt-1 text-zinc-400">{prob.summary}</p>
            <p className="mt-1 text-sm text-zinc-500">{prob.level === 'core' ? 'Core new grad question' : 'Stretch question'} for {prob.companies.map((c) => COMPANY_NAME[c]).join(', ')}</p>
          </div>

          <ol className="space-y-4">
            {prob.steps.map((s, i) => {
              const key = `${prob.id}:${i}`;
              const open = shown.has(i);
              return (
                <li key={key}>
                  <Card className="p-5">
                    <div className="mb-2 flex items-baseline gap-3">
                      <span className="tnum text-sm font-semibold text-violet-400">Step {i + 1}</span>
                      <h3 className="text-lg font-semibold text-zinc-100">{s.title}</h3>
                    </div>
                    <p className="mb-3 text-zinc-300">{s.prompt}</p>
                    <textarea value={notes[key] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [key]: e.target.value }))} rows={3}
                      placeholder="Your answer, in bullets"
                      className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500" />
                    {open ? (
                      <ul className="mt-3 space-y-2 border-l-2 border-amber-500 pl-4">
                        {s.reference.map((r, k) => <li key={k} className="leading-relaxed text-zinc-200">{r}</li>)}
                      </ul>
                    ) : (
                      <Button variant="subtle" className="mt-3" onClick={() => setShown((x) => new Set(x).add(i))}><Eye size={15} />Compare with reference</Button>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>

          <Card className="mt-4 p-5">
            <h3 className="mb-2 font-semibold text-zinc-100">Follow-ups an interviewer may ask</h3>
            <ul className="mb-5 list-disc space-y-1 pl-5 text-zinc-300">
              {prob.followUps.map((f) => <li key={f}>{f}</li>)}
            </ul>
            {rated ? (
              <p className="text-emerald-300"><span className="hl">Saved.</span> It will come back for review on schedule.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-2 text-zinc-400">How close were you?</span>
                <Button variant="subtle" onClick={() => rate(0)}>Missed most of it</Button>
                <Button variant="subtle" onClick={() => rate(1)}>Got the outline</Button>
                <Button variant="subtle" onClick={() => rate(2)}>Close to the reference</Button>
                <Button variant="subtle" onClick={() => rate(3)}>Could teach it</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

import { CheckCircle2, ChevronDown, Circle, ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AREA_NAME, PLAYBOOKS, RESOURCES } from '../data/companies';
import { BANKS, GENERAL_BEHAVIORAL } from '../data/companyBank';
import { allPrep } from '../lib/prep';
import { NEETCODE } from '../data/neetcode';
import { BehavioralPractice } from './AI';
import { COMPANIES, COMPANY_NAME } from '../data/meta';
import { AREA_DECK, AREA_MODE, areaStats, readiness } from '../lib/coach';
import { companyCoverage, sharedWith } from '../lib/coverage';
import type { CompanyId, Mode, Progress } from '../types';
import { Bar, Button, Card, PageTitle, SectionTitle } from './ui';

interface Props {
  progress: Progress;
  solved: Set<string>;
  initial?: CompanyId | 'all';
  open: (m: Mode, opts?: { deck?: string; company?: CompanyId | 'all' }) => void;
  onLearn: (lessonId: string) => void;
}

export default function Companies({ progress, solved, initial, open, onLearn }: Props) {
  const [id, setId] = useState<CompanyId>(initial && initial !== 'all' ? initial : 'citadel');
  const pb = PLAYBOOKS.find((p) => p.id === id)!;
  const stats = useMemo(() => areaStats(progress), [progress]);
  const r = readiness(id, stats);
  const tier = COMPANIES.find((c) => c.id === id)!.tier;
  const bank = BANKS.find((b) => b.id === id)!;
  const [tab, setTab] = useState<'playbook' | 'coding' | 'behavioral'>('playbook');
  const [practice, setPractice] = useState<string | null>(null);
  const ncBySlug = Object.fromEntries(NEETCODE.map((p) => [p.slug, p]));
  const codingDone = bank.coding.filter((q) => q.nc && solved.has(q.nc)).length;
  const cov = companyCoverage(id, progress, solved, r.score);
  const prep = useMemo(() => allPrep(progress, solved), [progress, solved]);
  const allCov = Object.fromEntries(COMPANIES.map((c) => [c.id, prep[c.id].overall]));
  // Problems that several companies ask come first: one solve counts for all of them.
  const coding = useMemo(() => bank.coding.map((q) => ({ q, shared: sharedWith(q, id) })).sort((a, b) => b.shared.length - a.shared.length), [bank, id]);

  return (
    <div>
      <PageTitle sub="What each loop usually looks like for new grads, what it rewards, and how ready you are. Loops change and differ by team, so confirm your format with your recruiter.">Company playbooks</PageTitle>

      <div className="mb-8 flex flex-wrap gap-x-1 gap-y-2 border-b border-zinc-800 pb-px">
        {COMPANIES.map((c) => (
          <button key={c.id} onClick={() => setId(c.id)}
            className={`-mb-px border-b-2 px-3 py-2 transition-colors ${id === c.id ? 'border-violet-500 font-semibold text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-200'}`}>
            {c.name}<span className="tnum ml-1.5 text-xs font-normal text-zinc-500">{Math.round(allCov[c.id] * 100)}%</span>
          </button>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-8">
          <div>
            <p className="text-sm text-zinc-500">{tier === 'quant' ? 'Quant trading firm' : tier === 'bank' ? 'Investment bank engineering' : 'Big tech and frontier AI'}</p>
            <h2 className="mt-1 text-[32px] font-bold leading-tight tracking-[-0.02em] text-zinc-100">{COMPANY_NAME[id]}</h2>
            <p className="mt-2 max-w-[60ch] text-lg leading-relaxed text-zinc-300">{pb.tagline}</p>
            <div className="mt-5 inline-flex rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
              {([['playbook', 'Playbook'], ['coding', `Coding questions (${codingDone}/${bank.coding.filter((q) => q.nc).length} on NeetCode)`], ['behavioral', 'Behavioral']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)} className={`rounded px-3 py-1.5 text-sm transition-colors ${tab === k ? 'bg-zinc-950 font-semibold text-zinc-100 shadow-[inset_0_-2px_0_rgb(var(--hl-500))]' : 'text-zinc-400 hover:text-zinc-100'}`}>{label}</button>
              ))}
            </div>
          </div>

          {tab === 'coding' && (
            <>
              <section>
                <p className="mb-4 max-w-[65ch] leading-relaxed text-zinc-300">{bank.shape}</p>
                <SectionTitle>Reported and closely matching problems</SectionTitle>
                <p className="mb-3 text-sm text-zinc-500">Sorted so problems other companies also ask come first. Solving one counts for every company listed under it.</p>
                <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800 bg-zinc-900">
                  {coding.map(({ q, shared }) => {
                    const nc = q.nc ? ncBySlug[q.nc] : undefined;
                    const done = q.nc ? solved.has(q.nc) : false;
                    return (
                      <li key={q.name} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        {nc ? (done ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Circle size={18} className="text-zinc-600" />) : <span className="w-[18px]" />}
                        <a href={nc ? nc.url : q.url} target="_blank" rel="noreferrer" className="font-medium text-zinc-100 hover:underline">{q.name}</a>
                        <span className="text-xs text-zinc-500">{nc ? `NeetCode · ${nc.difficulty}` : 'LeetCode'}</span>
                        <span className="w-full pl-[30px] text-sm text-zinc-400 sm:w-auto sm:flex-1 sm:pl-0 sm:text-right">{q.why}</span>
                        {shared.length > 0 && <span className="w-full pl-[30px] text-xs text-zinc-500">Also asked at {shared.map((s) => COMPANY_NAME[s]).join(', ')}</span>}
                      </li>
                    );
                  })}
                </ul>
              </section>
              {bank.build && (
                <section>
                  <SectionTitle>Build-it and systems questions</SectionTitle>
                  <ul className="space-y-2">
                    {bank.build.map((q) => <li key={q.name} className="border-l-2 border-amber-500 pl-3"><div className="text-zinc-100">{q.name}</div><div className="text-sm text-zinc-500">{q.why}</div></li>)}
                  </ul>
                </section>
              )}
              <section>
                <SectionTitle>Where this comes from</SectionTitle>
                <ul className="space-y-1">{bank.sources.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-violet-300 hover:underline">{l.label}<ExternalLink size={12} /></a></li>)}</ul>
                <p className="mt-2 text-xs text-zinc-500">Reported by candidates in public write-ups. Companies don't publish question lists, and loops change.</p>
              </section>
            </>
          )}

          {tab === 'behavioral' && (
            <section>
              <p className="mb-4 max-w-[65ch] text-zinc-300">Pick a question, answer it like you would out loud, and Claude grades it against what {COMPANY_NAME[id]} looks for. Questions marked "reported" came up in candidate write-ups.</p>
              <div className="space-y-2">
                {[...bank.behavioral, ...GENERAL_BEHAVIORAL].map((b) => {
                  const isOpen = practice === b.q;
                  return (
                    <div key={b.q} className="rounded-md border border-zinc-800 bg-zinc-900">
                      <button onClick={() => setPractice(isOpen ? null : b.q)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
                        <div className="flex-1">
                          <div className="text-zinc-100">{b.q}</div>
                          <div className="mt-0.5 text-sm text-zinc-500">{b.tests}{b.reported ? ' · reported' : ''}</div>
                        </div>
                        <ChevronDown size={16} className={`mt-1 shrink-0 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && <div className="border-t border-zinc-800 p-4"><BehavioralPractice question={b.q} company={id} /></div>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {tab === 'playbook' && <>

          <section>
            <SectionTitle>The usual loop</SectionTitle>
            <ol className="space-y-2">
              {pb.loop.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-sm text-zinc-400">{i + 1}</span>
                  <span className="leading-relaxed text-zinc-200">{s}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <SectionTitle>What they test</SectionTitle>
            <ul className="list-disc space-y-1 pl-5 text-zinc-200 marker:text-zinc-600">
              {pb.focus.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </section>

          <section>
            <SectionTitle>What they value</SectionTitle>
            <p className="max-w-[65ch] leading-relaxed text-zinc-200">{pb.values}</p>
          </section>

          <section>
            <SectionTitle>Tips</SectionTitle>
            <ul className="space-y-2">
              {pb.tips.map((t) => <li key={t} className="border-l-2 border-amber-500 pl-3 leading-relaxed text-zinc-200">{t}</li>)}
            </ul>
          </section>

          <section>
            <SectionTitle>Read before your interview</SectionTitle>
            <ul className="space-y-1.5">
              {pb.links.map((l) => (
                <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-violet-300 underline decoration-violet-500/40 underline-offset-4 hover:decoration-violet-500">{l.label}<ExternalLink size={13} /></a></li>
              ))}
            </ul>
          </section>
          </>}
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">What you've covered</h3>
              <span className="tnum text-3xl font-bold text-zinc-100"><span className="hl">{Math.round(prep[id].overall * 100)}%</span></span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{prep[id].level}. The same number as on Today.</p>
            <div className="mb-4 mt-3 space-y-2 rounded-md bg-zinc-950 p-3">
              {prep[id].parts.map((x) => (
                <div key={x.key} className="grid grid-cols-[1fr_70px] items-center gap-3 text-sm">
                  <div><div className="text-zinc-200">{x.label}</div><div className="text-xs text-zinc-500">{x.detail}</div></div>
                  <div><Bar value={x.value} /><div className="tnum text-right text-xs text-zinc-400">{Math.round(x.value * 100)}%</div></div>
                </div>
              ))}
              <div className="pt-1 text-xs text-zinc-400">Biggest lever right now: <span className="text-zinc-200">{prep[id].next.action.toLowerCase()}</span></div>
            </div>
            <div className="mb-1 flex justify-between text-sm"><span className="text-zinc-200">Reported problems solved</span><span className="tnum text-zinc-500">{cov.coding.done}/{cov.coding.total}</span></div>
            <Bar value={cov.coding.total ? cov.coding.done / cov.coding.total : 0} color="bg-amber-500" />
            <h4 className="mb-2 mt-4 text-sm font-medium text-zinc-200">Patterns {COMPANY_NAME[id]} uses</h4>
            <div className="space-y-2">
              {cov.lessons.map((l) => (
                <button key={l.id} onClick={() => onLearn(l.id)} className="block w-full text-left">
                  <div className="mb-1 flex justify-between text-sm"><span className="text-zinc-300 hover:text-zinc-100">{l.name}</span><span className="tnum text-zinc-500">{Math.round(l.score * 100)}%</span></div>
                  <Bar value={l.score} color={l.score >= 0.75 ? 'bg-emerald-500' : 'bg-violet-500'} />
                </button>
              ))}
            </div>
            {cov.overlap.length > 0 && (
              <>
                <h4 className="mb-2 mt-4 text-sm font-medium text-zinc-200">This prep also covers</h4>
                <div className="flex flex-wrap gap-1.5">
                  {cov.overlap.map((o) => (
                    <button key={o.id} onClick={() => setId(o.id)} className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">
                      {COMPANY_NAME[o.id]} <span className="text-zinc-500">{o.shared} shared</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">Your readiness</h3>
              <span className="tnum text-3xl font-bold text-zinc-100"><span className="hl">{Math.round(r.score * 100)}%</span></span>
            </div>
            <p className="mb-4 mt-1 text-sm text-zinc-500">Weighted by how much {COMPANY_NAME[id]} leans on each skill. Click a row to practice it.</p>
            <div className="space-y-3">
              {r.parts.map((p) => (
                <button key={p.area} onClick={() => open(AREA_MODE[p.area], { company: id, deck: AREA_DECK[p.area] })} className="block w-full text-left">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-zinc-200">{AREA_NAME[p.area]}</span>
                    <span className="tnum text-zinc-500">{Math.round(p.weight * 100)}% of loop</span>
                  </div>
                  <Bar value={p.mastery} color={p.mastery > 0.7 ? 'bg-emerald-500' : 'bg-violet-500'} />
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => open('syntax', { company: id })}>Practice {COMPANY_NAME[id]} problems</Button>
              <Button variant="subtle" onClick={() => open('cards', { company: id })}>Flashcards</Button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-semibold text-zinc-100">Good free resources</h3>
            <ul className="space-y-3">
              {RESOURCES.map((x) => (
                <li key={x.url}>
                  <a href={x.url} target="_blank" rel="noreferrer" className="font-medium text-violet-300 hover:underline">{x.label}</a>
                  <p className="text-sm text-zinc-500">{x.note}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

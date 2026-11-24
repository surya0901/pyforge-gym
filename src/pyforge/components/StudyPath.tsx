import { CheckCircle2, ChevronDown, Circle, ExternalLink, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL } from '../data';
import { NC_SECTIONS, NEETCODE, SECTION_PRIMER, type NCProblem } from '../data/neetcode';
import { mastery } from '../lib/storage';
import type { Mode, PatternId, Progress } from '../types';
import { Bar, Button, Card, PageTitle, SectionTitle } from './ui';

interface Props {
  progress: Progress;
  solved: Set<string>;
  syncedAt: string | null;
  cloud: boolean;
  pace: number;
  setPace: (n: number) => void;
  toggleLocal: (slug: string) => void;
  open: (m: Mode, opts?: { pattern?: PatternId | 'all'; focus?: string }) => void;
}

const DIFF_DOT = { Easy: 'bg-emerald-500', Medium: 'bg-amber-600', Hard: 'bg-rose-500' };
const EX = Object.fromEntries(ALL.map((e) => [e.id, e]));
const MODE_OF = (id: string): Mode => (id.startsWith('syn-') ? 'syntax' : id.startsWith('bug-') ? 'bug' : 'pattern');
const KIND_LABEL = (id: string) => (id.startsWith('syn-') ? 'Syntax drill' : id.startsWith('bug-') ? 'Bug hunt' : 'Pattern speed');

function ago(iso: string | null): string {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(m)) return '';
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

/** First pass: every Easy and Medium in roadmap order; Hards once their section's others are done. */
export function nextProblems(solved: Set<string>, n = 3): NCProblem[] {
  const out: NCProblem[] = [];
  for (const sec of NC_SECTIONS) {
    const items = NEETCODE.filter((p) => p.section === sec && !solved.has(p.slug));
    const nonHard = items.filter((p) => p.difficulty !== 'Hard');
    for (const p of nonHard.length ? nonHard : items) {
      out.push(p);
      if (out.length >= n) return out;
    }
  }
  return out;
}

export const SITE = 'https://surya0901.github.io/pyforge/';
// Runs on neetcode.io: reads which NeetCode 150 rows are ticked and sends you back here with the list.
const BOOKMARKLET = `javascript:(()=>{const r=[...document.querySelectorAll('tr')].filter(t=>t.querySelector('button.neeter-status-toggle'));if(r.length<100){alert('Open neetcode.io/practice/practice/neetcode150 first, signed in.');return}const s=r.filter(t=>t.querySelector('button.neeter-status-toggle[aria-pressed=%22true%22]')).map(t=>t.querySelector('a[href*=%22/problems/%22]').getAttribute('href').split('?')[0].split('/problems/')[1].split('/')[0]);location.href='${SITE}#nc='+s.join(',')})()`;

function SyncBookmark() {
  const ref = useRef<HTMLAnchorElement>(null);
  // React refuses javascript: hrefs, so set it on the element directly.
  useEffect(() => { ref.current?.setAttribute('href', BOOKMARKLET); }, []);
  return (
    <details className="mt-3 text-sm text-zinc-400">
      <summary className="cursor-pointer text-violet-300">Sync from NeetCode in one click</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Drag this to your bookmarks bar: <a ref={ref} onClick={(e) => e.preventDefault()} className="rounded border border-violet-500/50 px-2 py-0.5 font-medium text-violet-300">pyforge sync</a></li>
        <li>Open <a href="https://neetcode.io/practice/practice/neetcode150" target="_blank" rel="noreferrer" className="underline">NeetCode 150</a> while signed in.</li>
        <li>Click the bookmark. It brings you back here with every solved problem ticked.</li>
      </ol>
    </details>
  );
}

export default function StudyPath({ progress, solved, syncedAt, cloud, pace, setPace, toggleLocal, open }: Props) {
  const [openSec, setOpenSec] = useState<string | null>(null);
  const done = NEETCODE.filter((p) => solved.has(p.slug)).length;
  const next = nextProblems(solved, 3);
  const current = next[0];

  // Drills to do now: ones linked to problems you've solved but haven't mastered yet, newest roadmap first.
  const drillsDue = useMemo(() => {
    const out: { id: string; problem: NCProblem }[] = [];
    for (const p of [...NEETCODE].reverse()) {
      if (!solved.has(p.slug)) continue;
      for (const id of p.drills) if (mastery(progress.cards[id]) < 0.7 && EX[id]) out.push({ id, problem: p });
    }
    return out.slice(0, 4);
  }, [solved, progress]);

  // Whole-plan timeline at the chosen pace.
  const timeline = useMemo(() => {
    let day = 0;
    const today = new Date();
    return NC_SECTIONS.map((sec) => {
      const left = NEETCODE.filter((p) => p.section === sec && !solved.has(p.slug)).length;
      const total = NEETCODE.filter((p) => p.section === sec).length;
      day += Math.ceil(left / pace);
      const d = new Date(today);
      d.setDate(d.getDate() + day);
      return { sec, left, total, finish: left ? d : null };
    });
  }, [solved, pace]);
  const withDates = timeline.filter((t) => t.finish);
  const finishAll = withDates.length ? withDates[withDates.length - 1].finish : null;

  return (
    <div className="space-y-10">
      <PageTitle sub="Solve on NeetCode, then come back here to lock the Python in with drills. The order follows NeetCode's roadmap, so each pattern builds on the last.">Study path</PageTitle>

      {/* Progress + sync */}
      <section className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold text-zinc-100">NeetCode 150</h3>
            <span className="tnum text-3xl font-bold text-zinc-100"><span className="hl">{done}</span><span className="text-lg text-zinc-500"> / 150</span></span>
          </div>
          <div className="mt-3"><Bar value={done / 150} color="bg-amber-500" /></div>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-zinc-500">
            <RefreshCw size={13} />
            {cloud
              ? syncedAt ? `Synced from your NeetCode account ${ago(syncedAt)}. Updates automatically every hour.` : 'Waiting for the first NeetCode sync.'
              : syncedAt ? `Synced from NeetCode ${ago(syncedAt)}. Updates every hour while Chrome is open, or click the bookmark below.` : 'Not synced yet. Use the bookmark below, or tick problems off as you solve them.'}
          </p>
          {!cloud && <SyncBookmark />}
        </Card>
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-zinc-100">Your whole plan</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-zinc-300">
            At
            <select value={pace} onChange={(e) => setPace(Number(e.target.value))} aria-label="Problems per day"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-100">
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            NeetCode problem{pace > 1 ? 's' : ''} a day, you finish the 150 on
            <span className="hl font-semibold text-zinc-100">{finishAll ? finishAll.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'done already'}</span>.
          </div>
          <p className="mt-2 text-sm text-zinc-500">Each day: solve on NeetCode (25–40 min), then 10 minutes of the drills below for what you just solved. Breaks: flashcards or one bug hunter drill.</p>
        </Card>
      </section>

      {/* Next steps */}
      <section>
        <SectionTitle>Do this next</SectionTitle>
        <ol className="space-y-3">
          {current && !NEETCODE.some((p) => p.section === current.section && solved.has(p.slug)) ? (
            <li>
              <Card className="p-4">
                <div className="text-sm text-zinc-500">Step 1 · Read the pattern (2 min)</div>
                <div className="mt-1 font-semibold text-zinc-100">{current.section}</div>
                <p className="mt-1 max-w-[70ch] text-zinc-300">{SECTION_PRIMER[current.section]}</p>
              </Card>
            </li>
          ) : null}
          {next.map((p, i) => (
            <li key={p.slug}>
              <Card className={`flex flex-wrap items-center gap-4 p-4 ${i === 0 ? 'border-violet-500' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-zinc-500">{i === 0 ? 'Solve now on NeetCode' : 'Then'} · {p.section}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-lg font-semibold text-zinc-100">
                    <span className={`h-2 w-2 rounded-full ${DIFF_DOT[p.difficulty]}`} />{p.name}
                    <span className="text-sm font-normal text-zinc-500">{p.difficulty}</span>
                  </div>
                  {p.drills.length > 0 && <div className="mt-1 text-sm text-zinc-500">Afterwards here: {p.drills.map(KIND_LABEL).join(', ')}</div>}
                </div>
                <a href={p.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3.5 py-1.5 font-medium text-white hover:bg-violet-700">
                  Open on NeetCode <ExternalLink size={14} />
                </a>
              </Card>
            </li>
          ))}
          {drillsDue.length > 0 && (
            <li>
              <Card className="p-4">
                <div className="text-sm text-zinc-500">Come back and drill what you solved</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {drillsDue.map(({ id, problem }) => (
                    <Button key={id} variant="subtle" onClick={() => open(MODE_OF(id), { pattern: problem.pattern, focus: id })}>
                      {KIND_LABEL(id)}: {EX[id].title}
                    </Button>
                  ))}
                </div>
              </Card>
            </li>
          )}
          {current && (
            <li>
              <Card className="p-4">
                <div className="text-sm text-zinc-500">Pattern check for {current.section}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="subtle" onClick={() => open('syntax', { pattern: current.pattern })}>Syntax drills</Button>
                  <Button variant="subtle" onClick={() => open('bug', { pattern: current.pattern })}>Bug hunts</Button>
                  <Button variant="subtle" onClick={() => open('pattern', { pattern: current.pattern })}>Pattern speed</Button>
                </div>
              </Card>
            </li>
          )}
        </ol>
      </section>

      {/* Roadmap */}
      <section>
        <SectionTitle aside={<span className="text-sm text-zinc-500">Tap a section for its problems</span>}>Roadmap</SectionTitle>
        <div className="space-y-2">
          {timeline.map(({ sec, left, total, finish }) => {
            const solvedHere = total - left;
            const isOpen = openSec === sec;
            return (
              <Card key={sec} className="overflow-hidden">
                <button onClick={() => setOpenSec(isOpen ? null : sec)} className="grid w-full grid-cols-[1fr_120px_auto] items-center gap-4 px-4 py-3 text-left">
                  <div>
                    <div className="font-medium text-zinc-100">{left === 0 ? <span className="hl">{sec}</span> : sec}</div>
                    <div className="text-xs text-zinc-500">{solvedHere} of {total} solved{finish ? ` · on pace by ${finish.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</div>
                  </div>
                  <Bar value={solvedHere / total} color={left === 0 ? 'bg-emerald-500' : 'bg-violet-500'} />
                  <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
                    {NEETCODE.filter((p) => p.section === sec).map((p) => {
                      const isDone = solved.has(p.slug);
                      return (
                        <li key={p.slug} className="flex flex-wrap items-center gap-3 px-4 py-2">
                          <button onClick={() => !cloud && toggleLocal(p.slug)} disabled={cloud} title={cloud ? 'Synced from NeetCode' : 'Mark solved'}
                            className="text-zinc-500 disabled:cursor-default">
                            {isDone ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Circle size={18} />}
                          </button>
                          <a href={p.url} target="_blank" rel="noreferrer" className={`flex-1 hover:underline ${isDone ? 'text-zinc-400' : 'text-zinc-100'}`}>{p.name}</a>
                          <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500"><span className={`h-2 w-2 rounded-full ${DIFF_DOT[p.difficulty]}`} />{p.difficulty}</span>
                          {p.drills.slice(0, 2).map((id) => (
                            <button key={id} onClick={() => open(MODE_OF(id), { pattern: p.pattern, focus: id })}
                              className="rounded border border-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-100">{KIND_LABEL(id)}</button>
                          ))}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

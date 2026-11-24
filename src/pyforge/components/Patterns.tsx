import { ArrowLeft, CheckCircle2, Circle, ExternalLink, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { LESSONS, type Lesson } from '../data/lessons';
import { NEETCODE } from '../data/neetcode';
import { highlight } from '../lib/highlight';
import { lessonCoverage, patternsSummary } from '../lib/coverage';
import type { LessonState, Mode, PatternId, Progress } from '../types';
import { Bar, Button, Card, PageTitle, SectionTitle } from './ui';

interface Props {
  progress: Progress;
  solved: Set<string>;
  initial?: string;
  onLesson: (id: string, patch: (s: LessonState) => LessonState) => void;
  open: (m: Mode, opts?: { pattern?: PatternId | 'all'; company?: 'all' }) => void;
}

const NC = Object.fromEntries(NEETCODE.map((p) => [p.slug, p]));

export default function Patterns({ progress, solved, initial, onLesson, open }: Props) {
  const [sel, setSel] = useState<string | null>(initial ?? null);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [sel]);
  const lesson = sel ? LESSONS.find((l) => l.id === sel) : undefined;
  if (lesson) return <LessonView key={lesson.id} lesson={lesson} progress={progress} solved={solved} onLesson={onLesson} open={open} back={() => setSel(null)} next={() => setSel(LESSONS[lesson.n + 1]?.id ?? null)} />;
  return <LessonList progress={progress} solved={solved} pick={setSel} />;
}

function LessonList({ progress, solved, pick }: { progress: Progress; solved: Set<string>; pick: (id: string) => void }) {
  const sum = useMemo(() => patternsSummary(progress, solved), [progress, solved]);
  const nextUp = sum.rows.find((r) => !r.cov.learned)?.lesson;
  return (
    <div>
      <PageTitle sub="Almost every coding interview question is one of these patterns in disguise. Learn how to spot each one, read the template, then solve its NeetCode problems. A pattern counts as learned once you've read it, passed its quick check and solved most of its problems.">Patterns to learn</PageTitle>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="text-sm text-zinc-500">Patterns learned</div><div className="tnum mt-1 text-3xl font-bold text-zinc-100">{sum.learned}<span className="text-lg font-medium text-zinc-500"> / {LESSONS.length}</span></div></Card>
        <Card className="p-5"><div className="text-sm text-zinc-500">Started</div><div className="tnum mt-1 text-3xl font-bold text-zinc-100">{sum.started}<span className="text-lg font-medium text-zinc-500"> / {LESSONS.length}</span></div></Card>
        <Card className="p-5">
          <div className="text-sm text-zinc-500">Overall pattern coverage</div>
          <div className="tnum mt-1 text-3xl font-bold text-zinc-100">{Math.round(sum.avg * 100)}%</div>
          <div className="mt-2"><Bar value={sum.avg} /></div>
        </Card>
      </div>

      {nextUp && (
        <button onClick={() => pick(nextUp.id)} className="mb-8 block w-full rounded-lg border border-violet-500/60 bg-violet-500/5 p-5 text-left transition-colors hover:bg-violet-500/10">
          <div className="text-sm text-zinc-500">Learn next</div>
          <div className="mt-0.5 text-xl font-semibold text-zinc-100">{nextUp.name}</div>
          <div className="mt-1 text-zinc-400">{nextUp.oneLiner}</div>
        </button>
      )}

      <ol className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900">
        {sum.rows.map(({ lesson: l, cov }) => (
          <li key={l.id}>
            <button onClick={() => pick(l.id)} className="grid w-full grid-cols-[2.25rem_1fr] items-center gap-x-3 gap-y-1 px-4 py-3.5 text-left hover:bg-zinc-950/40 sm:grid-cols-[2.25rem_1fr_10rem]">
              <span className={`tnum flex h-8 w-8 items-center justify-center rounded-full border text-sm ${cov.learned ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 text-zinc-400'}`}>
                {cov.learned ? <CheckCircle2 size={16} /> : l.n === 0 ? '0' : l.n}
              </span>
              <span>
                <span className="font-medium text-zinc-100">{l.name}</span>{l.n === 0 && <span className="ml-2 text-xs text-zinc-500">start here</span>}
                <span className="block text-sm text-zinc-500">{l.oneLiner}</span>
              </span>
              <span className="col-start-2 sm:col-start-3">
                <span className="mb-1 flex justify-between text-xs text-zinc-500"><span>{cov.solved}/{cov.total} solved</span><span className="tnum">{Math.round(cov.score * 100)}%</span></span>
                <Bar value={cov.score} color={cov.learned ? 'bg-emerald-500' : 'bg-violet-500'} />
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-zinc-500">The 15 patterns follow the widely shared <a href="https://blog.algomaster.io/p/15-leetcode-patterns" target="_blank" rel="noreferrer" className="link">AlgoMaster list</a>. Pattern 0 covers hashing, since NeetCode 150 starts there. Each lesson links the NeetCode videos and free reading for it.</p>
    </div>
  );
}

function LessonView({ lesson: l, progress, solved, onLesson, open, back, next }: {
  lesson: Lesson; progress: Progress; solved: Set<string>;
  onLesson: Props['onLesson']; open: Props['open']; back: () => void; next: () => void;
}) {
  useEffect(() => { onLesson(l.id, (s) => (s.opened ? s : { ...s, opened: Date.now() })); }, [l.id]);  
  const cov = lessonCoverage(l, progress, solved);
  const nextLesson = LESSONS[l.n + 1];

  return (
    <div className="max-w-[860px]">
      <button onClick={back} className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100"><ArrowLeft size={15} />All patterns</button>
      <p className="text-sm text-zinc-500">{l.n === 0 ? 'Foundation' : `Pattern ${l.n} of 15`}</p>
      <h1 className="mt-1 text-[36px] font-bold leading-tight tracking-[-0.02em] text-zinc-100">{l.name}</h1>
      <p className="mt-2 text-xl leading-relaxed text-zinc-300">{l.oneLiner}</p>
      <div className="mt-4 flex max-w-md items-center gap-3 text-sm text-zinc-500">
        <div className="flex-1"><Bar value={cov.score} color={cov.learned ? 'bg-emerald-500' : 'bg-violet-500'} /></div>
        <span className="tnum">{Math.round(cov.score * 100)}% covered</span>
      </div>

      <div className="mt-10 space-y-10">
        <section>
          <SectionTitle>How to spot it</SectionTitle>
          <ul className="space-y-2">{l.signals.map((s) => <li key={s} className="border-l-2 border-amber-500 pl-3 leading-relaxed text-zinc-200">{s}</li>)}</ul>
        </section>

        <section>
          <SectionTitle>The idea</SectionTitle>
          <p className="max-w-[68ch] text-[17px] leading-[1.7] text-zinc-200">{l.idea}</p>
          <p className="mt-4 max-w-[68ch] rounded-md bg-zinc-900 px-4 py-3 leading-relaxed text-zinc-300"><span className="font-semibold text-zinc-100">Think of it like this. </span>{l.analogy}</p>
        </section>

        <section>
          <SectionTitle>Walk through it</SectionTitle>
          <p className="mb-3 font-medium text-zinc-100">{l.example.problem}</p>
          <ol className="space-y-2">
            {l.example.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-sm text-zinc-400">{i + 1}</span>
                <span className="leading-relaxed text-zinc-200">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionTitle aside={<span className="text-sm text-zinc-500">{l.complexity}</span>}>The Python template</SectionTitle>
          <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-[13.5px] leading-relaxed text-zinc-200">{l.template.split('\n').map((line, i) => <div key={i}>{line ? highlight(line, `${l.id}-${i}-`) : ' '}</div>)}</pre>
        </section>

        <section>
          <SectionTitle>Mistakes people make</SectionTitle>
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-zinc-200 marker:text-rose-400">{l.mistakes.map((m) => <li key={m}>{m}</li>)}</ul>
          {l.variants && <><h4 className="mb-1 mt-5 font-semibold text-zinc-100">Variations you'll see</h4><ul className="list-disc space-y-1 pl-5 text-zinc-300 marker:text-zinc-600">{l.variants.map((v) => <li key={v}>{v}</li>)}</ul></>}
        </section>

        <section>
          <SectionTitle>Quick check</SectionTitle>
          <div className="space-y-4">{l.check.map((_, i) => <CheckQ key={i} lesson={l} idx={i} state={progress.lessons?.[l.id]} onLesson={onLesson} />)}</div>
        </section>

        <section>
          <SectionTitle aside={<span className="text-sm text-zinc-500">{cov.solved}/{cov.total} solved</span>}>Now solve these on NeetCode</SectionTitle>
          <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800 bg-zinc-900">
            {l.problems.map((slug) => {
              const p = NC[slug];
              if (!p) return null;
              const done = solved.has(slug);
              return (
                <li key={slug} className="flex items-center gap-3 px-4 py-2.5">
                  {done ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Circle size={18} className="text-zinc-600" />}
                  <a href={p.url} target="_blank" rel="noreferrer" className={`flex-1 font-medium hover:underline ${done ? 'text-zinc-400' : 'text-zinc-100'}`}>{p.name}</a>
                  <span className="text-xs text-zinc-500">{p.difficulty}</span>
                  <ExternalLink size={13} className="text-zinc-500" />
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-sm text-zinc-500">Stuck for 20 minutes? Watch NeetCode's video for it, then close it and write the solution yourself from memory.</p>
        </section>

        <section>
          <SectionTitle>Watch and read</SectionTitle>
          <ul className="space-y-2">
            {resourcesFor(l).map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noreferrer" className="group flex items-start gap-2">
                  <ExternalLink size={14} className="mt-1 shrink-0 text-zinc-500" />
                  <span><span className="font-medium text-violet-300 group-hover:underline">{r.title}</span><span className="block text-sm text-zinc-500">{r.why}</span></span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-6">
          <Button onClick={() => open('pattern', { pattern: l.drill, company: 'all' })}>Drill spotting this pattern</Button>
          <Button variant="subtle" onClick={() => open('syntax', { pattern: l.drill, company: 'all' })}>Type its Python</Button>
          {nextLesson && <Button variant="subtle" onClick={next}>Next: {nextLesson.name}</Button>}
        </div>
      </div>
    </div>
  );
}

function CheckQ({ lesson, idx, state, onLesson }: { lesson: Lesson; idx: number; state?: LessonState; onLesson: Props['onLesson'] }) {
  const c = lesson.check[idx];
  const [pick, setPick] = useState<number | null>(null);
  const passedBefore = state?.checks?.[idx];
  const answer = (i: number) => {
    if (pick !== null) return;
    setPick(i);
    // Once passed it stays passed. A miss can be fixed by trying again.
    onLesson(lesson.id, (s) => ({ ...s, checks: { ...(s.checks ?? {}), [idx]: i === c.answer || !!s.checks?.[idx] } }));
  };
  const right = pick === c.answer;
  return (
    <Card className="p-5">
      <p className="font-medium leading-relaxed text-zinc-100">{c.q}{passedBefore && pick === null && <span className="ml-2 text-xs font-normal text-emerald-400">passed before</span>}</p>
      <div className="mt-3 grid gap-2">
        {c.options.map((o, i) => {
          const cls = pick === null ? 'border-zinc-800 text-zinc-300 hover:border-zinc-600'
            : i === c.answer ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
            : i === pick ? 'border-rose-500/60 bg-rose-500/10 text-rose-200' : 'border-zinc-800 text-zinc-500';
          return <button key={i} onClick={() => answer(i)} className={`rounded-md border px-3 py-2 text-left text-[15px] transition-colors ${cls}`}>{o}</button>;
        })}
      </div>
      {pick !== null && (
        <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
          <p className="flex items-start gap-2">{right ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-rose-400" />}
            <span className="text-zinc-200"><span className="font-semibold">{right ? 'Right. ' : 'Not this one. '}</span>{c.why}</span></p>
          {!right && c.whyNot?.[pick] && (
            <p className="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-300"><span className="font-semibold text-zinc-100">Why your pick doesn't work: </span>{c.whyNot[pick]}</p>
          )}
          {!right && <p className="text-zinc-400">Reread "The idea" above with this in mind, then try again with the button below.</p>}
          {!right && <Button variant="subtle" onClick={() => setPick(null)}>Try again</Button>}
        </div>
      )}
    </Card>
  );
}

const LC_EXPLORE: Record<string, { title: string; url: string }> = {
  hashing: { title: 'LeetCode Explore: Hash Table', url: 'https://leetcode.com/explore/learn/card/hash-table/' },
  'two-pointers': { title: 'LeetCode Explore: Array and String (two pointer section)', url: 'https://leetcode.com/explore/learn/card/array-and-string/' },
  'binary-search': { title: 'LeetCode Explore: Binary Search', url: 'https://leetcode.com/explore/learn/card/binary-search/' },
  'reverse-ll': { title: 'LeetCode Explore: Linked List', url: 'https://leetcode.com/explore/learn/card/linked-list/' },
  'fast-slow': { title: 'LeetCode Explore: Linked List (two pointer technique)', url: 'https://leetcode.com/explore/learn/card/linked-list/' },
  'monotonic-stack': { title: 'LeetCode Explore: Queue and Stack', url: 'https://leetcode.com/explore/learn/card/queue-stack/' },
  bfs: { title: 'LeetCode Explore: Queue and Stack (BFS section)', url: 'https://leetcode.com/explore/learn/card/queue-stack/' },
  'tree-traversal': { title: 'LeetCode Explore: Binary Tree', url: 'https://leetcode.com/explore/learn/card/data-structure-tree/' },
  dfs: { title: 'LeetCode Explore: Graph', url: 'https://leetcode.com/explore/learn/card/graph/' },
  backtracking: { title: 'LeetCode Explore: Recursion II (backtracking)', url: 'https://leetcode.com/explore/learn/card/recursion-ii/' },
  dp: { title: 'LeetCode Explore: Dynamic Programming', url: 'https://leetcode.com/explore/learn/card/dynamic-programming/' },
  'top-k': { title: 'LeetCode Explore: Heap', url: 'https://leetcode.com/explore/learn/card/heap/' },
};

/** Free videos and reading for a lesson. NeetCode problem pages each have a video walkthrough. */
function resourcesFor(l: Lesson) {
  const first = NC[l.problems[0]];
  const second = NC[l.problems[1]];
  const q = encodeURIComponent(`${l.name} pattern leetcode explained`);
  const out = [
    first && { title: `NeetCode video: ${first.name}`, url: first.url, why: 'Watch the walkthrough on the problem page, then close it and code it yourself from memory.' },
    second && { title: `NeetCode video: ${second.name}`, url: second.url, why: 'A second problem with the same pattern, so you see what changes and what stays the same.' },
    { title: `YouTube: ${l.name} explained`, url: `https://www.youtube.com/results?search_query=${q}`, why: 'Short pattern explainers from NeetCode, Greg Hogg and others. Pick one under 20 minutes.' },
    LC_EXPLORE[l.id] && { ...LC_EXPLORE[l.id], why: 'Free LeetCode lessons with small practice problems, good if the idea still feels shaky.' },
    { title: 'NeetCode roadmap', url: 'https://neetcode.io/roadmap', why: 'Where this pattern sits in the full NeetCode 150 order.' },
  ];
  return out.filter(Boolean) as { title: string; url: string; why: string }[];
}

import { Check, Clock, ExternalLink, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PATTERN_DRILLS } from '../data';
import { LESSONS } from '../data/lessons';
import { NEETCODE } from '../data/neetcode';
import { patternsSummary } from '../lib/coverage';
import { getLocal, setLocal, today } from '../lib/storage';
import type { CompanyId, Mode, Progress } from '../types';
import { Card } from './ui';
import { DECKS, FLASHCARDS } from '../data/flashcards';
import { COMPANY_NAME } from '../data/meta';
import { mistakeLog } from '../lib/mistakes';
import { mastery } from '../lib/storage';
import { getStatus } from './BlueprintBuilder';
import { BLUEPRINTS } from '../data/blueprints';
import { lessonForSlug } from '../lib/coverage';
import { finderAnswers, finderSessionNow, finderSessionsDone } from './PatternDrill';
import { nextProblems } from './StudyPath';
import { nextRound, practicalPartsToday } from '../lib/practical';
import { labState, labTouchedToday, nextLabTask, taskStatus } from './Lab';

interface FeedJob { id: string; company: string; title: string; location: string; url: string; posted?: string; ageDays?: number; tier: 'target' | 'big' | 'other' }
interface DayState { manual: Record<string, boolean>; applied: string[]; picks?: string[]; lesson?: string; deck?: string }

const FEED_URL = /github\.io$/.test(location.hostname)
  ? `${location.origin}/swe-job-tracker/data/apply-feed.json`
  : 'https://surya0901.github.io/swe-job-tracker/data/apply-feed.json';
const TRACKER = 'https://surya0901.github.io/swe-job-tracker/';
const APP_GOAL = 10;
const PER_COMPANY = 2; // recruiters see every application, so spread them out
const PATTERN_IDS = new Set(PATTERN_DRILLS.map((p) => p.id));

interface Props {
  progress: Progress;
  solved: Set<string>;
  open: (m: Mode, opts?: { deck?: string; focus?: string }) => void;
  onLearn: (lessonId?: string) => void;
}

export default function DailyChecklist({ progress, solved, open, onLearn }: Props) {
  const day = today();
  const key = `pyforge.daily.${day}`;
  const [state, setState] = useState<DayState>(() => getLocal<DayState>(key, { manual: {}, applied: [] }));
  const [appliedEver, setAppliedEver] = useState<Record<string, string>>(() => getLocal('pyforge.applied', {}));
  const [skipped, setSkipped] = useState<Record<string, true>>(() => getLocal('pyforge.skippedJobs', {}));
  const [feed, setFeed] = useState<FeedJob[] | null>(null);
  const [feedError, setFeedError] = useState(false);

  // Lock today's NeetCode picks and lesson at the start of the day so the list doesn't shift as you solve.
  const picks = useMemo(() => state.picks ?? nextProblems(solved, 2).map((p) => p.slug), [state.picks]);  
  // Today's lesson is the pattern behind today's problems (first one you haven't learned), so learning and solving line up.
  const lessonId = useMemo(() => {
    if (state.lesson) return state.lesson;
    const rows = patternsSummary(progress, solved).rows;
    const learned = (id: string) => rows.find((r) => r.lesson.id === id)?.cov.learned;
    const fromPicks = picks.map((sl) => lessonForSlug(sl)).find((id) => id && !learned(id));
    return fromPicks ?? rows.find((r) => !r.cov.learned)?.lesson.id ?? LESSONS[0].id;
  }, [state.lesson]);  
  useEffect(() => { if (!state.picks || !state.lesson) save({ ...state, picks, lesson: lessonId }); }, []);  

  useEffect(() => {
    fetch(FEED_URL, { cache: 'no-store' }).then((r) => r.json()).then((d) => setFeed((d as { jobs: never }).jobs)).catch(() => setFeedError(true));
  }, []);

  function save(s: DayState) { setState(s); setLocal(key, s); }
  const toggle = (id: string) => save({ ...state, manual: { ...state.manual, [id]: !state.manual[id] } });

  const start = new Date(); start.setHours(0, 0, 0, 0);
  const seenToday = (pred: (id: string) => boolean) => Object.entries(progress.cards).filter(([id, c]) => pred(id) && c.lastSeen >= start.getTime()).length;
  // Counts every answer today, mid-session included, so you never have to finish a whole session to tick this.
  // Ticks when you finish one full session today (its length is whatever the session has).
  const finderSessionToday = finderSessionsDone().some((t) => t >= start.getTime()) || finderCountToday(progress, start.getTime()) >= 10;
  const sessionNow = finderSessionNow();
  const cardsToday = seenToday((id) => id.startsWith('fc-'));
  const bugsToday = seenToday((id) => id.startsWith('bug-'));
  const pracToday = practicalPartsToday();
  const pracNext = nextRound();
  const oaToday = getLocal<{ at: number }[]>('pyforge.oa.history', []).filter((h) => h.at >= start.getTime()).length;
  const lesson = LESSONS.find((l) => l.id === lessonId)!;
  const lessonChecks = lesson.check.filter((_, i) => progress.lessons?.[lesson.id]?.checks?.[i]).length;
  // Opening the lesson isn't enough: it counts once every quick check is passed.
  const lessonDone = lessonChecks === lesson.check.length;
  const deckPick = useMemo(() => pickDeck(progress, state.deck), [state.deck]);  
  useEffect(() => { if (!state.deck) save({ ...state, deck: deckPick.id }); }, []);  
  const pickProbs = picks.map((s) => NEETCODE.find((p) => p.slug === s)!).filter(Boolean);
  // A problem counts as done once it passes here or shows as solved on NeetCode (the sync can lag up to an hour).
  const bpStatus = getStatus();
  const passedHere = (slug: string) => { const b = BLUEPRINTS.find((x) => x.nc === slug); const st = b && bpStatus[b.id]; return !!st && Math.max(st.guided ?? 0, st.blind ?? 0) >= start.getTime(); };
  const probDone = (slug: string) => solved.has(slug) || passedHere(slug);
  const ncDone = pickProbs.filter((p) => probDone(p.slug)).length;
  const nextPick = pickProbs.find((p) => !probDone(p.slug));
  const nextBp = nextPick && BLUEPRINTS.find((b) => b.nc === nextPick.slug);

  const labS = labState(); const labNext = nextLabTask(labS); const labStat = taskStatus(labNext, labS);
  const tasks = [
    { id: 'neetcode', mins: 80, title: `Solve today's ${pickProbs.length} NeetCode problems`, done: ncDone >= pickProbs.length || state.manual.neetcode, auto: true, progress: `${ncDone}/${pickProbs.length}`,
      detail: (
        <span className="block">
          <span className="block">Next in NeetCode's roadmap order. For each one: write your plan and code it here (hints, checks, speed test), then type it again from memory on NeetCode and submit. That second time is your blind pass.</span>
          <span className="mt-2 block space-y-1">
            {pickProbs.map((pp, k) => {
              const bp = BLUEPRINTS.find((b) => b.nc === pp.slug);
              const solvedNC = solved.has(pp.slug), here = passedHere(pp.slug);
              return (
                <span key={pp.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={solvedNC ? 'text-emerald-300' : here ? 'text-amber-200' : 'text-zinc-300'}>{solvedNC ? '✓' : here ? '◐' : `${k + 1}.`} {pp.name} <span className="text-zinc-500">· {pp.difficulty}</span></span>
                  {bp && !solvedNC && <button onClick={() => open('blueprint', { focus: bp.id })} className="link">{here ? 'Open again' : 'Plan and code it'}</button>}
                  {!solvedNC && <a href={pp.url} target="_blank" rel="noreferrer" className="link">{here ? 'Submit on NeetCode' : bp ? 'NeetCode page' : 'Solve on NeetCode'}</a>}
                  {here && !solvedNC && <span className="text-xs text-zinc-500">passed here, ticks fully once NeetCode shows it solved</span>}
                </span>
              );
            })}
          </span>
        </span>
      ),
      action: nextPick ? (nextBp ? <button onClick={() => open('blueprint', { focus: nextBp.id })} className="link">Start {nextPick.name}</button> : <a href={nextPick.url} target="_blank" rel="noreferrer" className="link">Open {nextPick.name}</a>) : null },
    { id: 'lesson', mins: 15, title: `Learn the pattern: ${lesson.name}`, detail: 'Read the lesson, watch one of its linked videos, then pass every quick check question.', done: lessonDone || state.manual.lesson, auto: true, progress: `${lessonChecks}/${lesson.check.length} checks`,
      action: <button onClick={() => onLearn(lesson.id)} className="link">Read lesson</button> },
    { id: 'finder', mins: 15, title: 'Pattern finder: one session', detail: finderSessionToday ? 'Done: you finished a full session today.' : sessionNow && sessionNow.pos > 0 ? `You're ${sessionNow.pos} of ${sessionNow.len} questions into your session. Finish it to tick this.` : `One session is ${sessionNow?.len ?? 10} questions, with a stopwatch report at the end.`, done: finderSessionToday || state.manual.finder, auto: true,
      action: <button onClick={() => open('pattern')} className="link">{sessionNow && sessionNow.pos > 0 && !finderSessionToday ? 'Continue' : 'Start'}</button>, progress: finderSessionToday ? '1/1 session' : `${sessionNow?.pos ?? 0}/${sessionNow?.len ?? 10}` },
    { id: 'oa', mins: 25, title: 'Mock OA: one timed set', detail: 'The 20 minute debugging section on weekdays, a full 2 problem OA on weekends.', done: oaToday > 0 || state.manual.oa, auto: true,
      action: <button onClick={() => open('oa')} className="link">Open Mock OA</button> },
    { id: 'bugs', mins: 12, title: 'Bug hunter: 3 programs', detail: 'Quant firms grade debugging and edge cases harder than most. Read each program like a reviewer, flag every broken line, aim for under 4 minutes each.', done: bugsToday >= 3 || state.manual.bugs, auto: true,
      action: <button onClick={() => open('bug')} className="link">Start</button>, progress: `${Math.min(bugsToday, 3)}/3` },
    { id: 'practical', mins: 30, title: `Practical round: ${pracNext.title}, ${pracNext.kind === 'codebase' ? 'step' : 'part'} ${pracNext.partIndex + 1}`, detail: pracNext.kind === 'codebase' ? 'An unfamiliar multi-file project: fix, extend, then speed up, the way Meta and Google now run one coding round.' : 'A class design problem that grows part by part. Write your approach and edge cases first, then try to pass on the first submit.', done: pracToday >= 1 || state.manual.practical, auto: true,
      action: <button onClick={() => open('practical', { focus: pracNext.id })} className="link">{pracNext.partIndex > 0 ? 'Continue' : 'Start'}</button>, progress: `${Math.min(pracToday, 1)}/1` },
    { id: 'cards', mins: 12, title: `Flashcards: 15 cards from ${deckPick.name}`, detail: `${deckPick.why} Type or say each answer; it gets checked and shows what to study for anything you miss.`, done: cardsToday >= 15 || state.manual.cards, auto: true,
      action: <button onClick={() => open('cards', { deck: deckPick.id })} className="link">Start {deckPick.short}</button>, progress: `${Math.min(cardsToday, 15)}/15` },
    { id: 'lab', mins: 40, title: `Build lab: ${labNext.n}. ${labNext.title}`, detail: labStat === 'built' ? 'Your repo passes the checks. Write the reflection to finish it.' : labStat === 'started' ? 'Keep going: push what you have, then hit Check now.' : `${labNext.why.split('. ')[0]}. Work on your laptop, push to swe-lab, then reflect.`, done: labTouchedToday() || state.manual.lab, auto: true,
      action: <button onClick={() => open('lab', { focus: labNext.id })} className="link">{labStat === 'new' ? 'Start task' : 'Continue'}</button> },
    { id: 'story', mins: 10, title: 'Behavioral: one STAR story out loud', detail: 'Pick a question on the Companies page, answer it out loud in 2 minutes, then check it.', done: !!state.manual.story, auto: false,
      action: <button onClick={() => open('companies')} className="link">Pick a question</button> },
    { id: 'apply', mins: 100, title: `Submit ${APP_GOAL} quality applications`, detail: 'About 10 minutes each: read the posting, match 2 or 3 of its keywords in your resume bullets, apply, then message one engineer or recruiter there.', done: state.applied.length >= APP_GOAL || state.manual.apply, auto: true,
      progress: `${Math.min(state.applied.length, APP_GOAL)}/${APP_GOAL}` },
  ];
  const doneMins = tasks.filter((t) => t.done).reduce((a, t) => a + t.mins, 0);
  const totalMins = tasks.reduce((a, t) => a + t.mins, 0);
  const doneCount = tasks.filter((t) => t.done).length;
  const hrs = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`);

  // Newest first (the feed is sorted that way), at most 2 per company per day.
  const queue = useMemo(() => {
    const perCo: Record<string, number> = {};
    for (const id of state.applied) { const j = feed?.find((x) => x.id === id); if (j) perCo[j.company] = (perCo[j.company] ?? 0) + 1; }
    const out: FeedJob[] = [];
    for (const j of feed ?? []) {
      if (appliedEver[j.id] || skipped[j.id]) continue;
      if ((perCo[j.company] ?? 0) >= PER_COMPANY) continue;
      perCo[j.company] = (perCo[j.company] ?? 0) + 1;
      out.push(j);
      if (out.length >= Math.max(0, APP_GOAL - state.applied.length) + 3) break;
    }
    return out;
  }, [feed, appliedEver, skipped, state.applied]);
  const days = (j: FeedJob) => (j.posted ? Math.max(0, Math.floor((Date.now() - new Date(j.posted).getTime()) / 86_400_000)) : j.ageDays);
  const ago = (d?: number) => (d == null ? '' : d === 0 ? 'Posted today' : d === 1 ? 'Posted yesterday' : `Posted ${d} days ago`);
  const markApplied = (j: FeedJob) => {
    const ever = { ...appliedEver, [j.id]: day };
    setAppliedEver(ever); setLocal('pyforge.applied', ever);
    save({ ...state, applied: [...state.applied, j.id] });
  };
  const skip = (j: FeedJob) => { const s = { ...skipped, [j.id]: true as const }; setSkipped(s); setLocal('pyforge.skippedJobs', s); };
  const undoLast = () => {
    const last = state.applied[state.applied.length - 1];
    if (!last) return;
    const ever = { ...appliedEver }; delete ever[last];
    setAppliedEver(ever); setLocal('pyforge.applied', ever);
    save({ ...state, applied: state.applied.slice(0, -1) });
  };

  return (
    <Card className="mt-8 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Today's checklist</h2>
        <span className="tnum text-sm text-zinc-400"><Clock size={13} className="mr-1 inline" />{hrs(totalMins - doneMins)} left of about {hrs(totalMins)} · {doneCount}/{tasks.length} done</span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">Resets every morning. Work top to bottom: learn, solve, drill, then apply. Most items tick themselves when you do them here.</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${(doneMins / totalMins) * 100}%` }} /></div>

      <ol className="mt-5 space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className={`flex gap-3 rounded-lg border px-4 py-3 ${t.done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800'}`}>
            <button onClick={() => toggle(t.id)} aria-label={t.done ? 'Mark not done' : 'Mark done'}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${t.done ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-600 hover:border-zinc-400'}`}>
              {t.done && <Check size={13} strokeWidth={3} />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className={`font-medium ${t.done ? 'text-zinc-400 line-through decoration-zinc-600' : 'text-zinc-100'}`}>{t.title}</span>
                <span className="tnum text-xs text-zinc-500">~{t.mins} min{t.progress ? ` · ${t.progress}` : ''}</span>
              </div>
              <div className="text-sm text-zinc-500">{t.detail}</div>
            </div>
            {!t.done && t.action && <div className="shrink-0 self-center text-sm">{t.action}</div>}
          </li>
        ))}
      </ol>

      <section className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold text-zinc-100">Today's {APP_GOAL} applications <span className="tnum text-sm font-normal text-zinc-500">{state.applied.length}/{APP_GOAL} · {Object.keys(appliedEver).length} all time</span></h3>
          <span className="flex gap-3 text-sm">
            {state.applied.length > 0 && <button onClick={undoLast} className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300"><RotateCcw size={13} />Undo last</button>}
            <a href={TRACKER} target="_blank" rel="noreferrer" className="link">Full job tracker</a>
          </span>
        </div>
        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-relaxed text-zinc-300">
          <p className="font-medium text-zinc-100">How today's 10 are picked, and how to apply well</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 marker:text-zinc-600">
            <li>Newest postings first. Most roles get the bulk of their applicants in the first week, so apply the day you see them.</li>
            <li>At most {PER_COMPANY} roles per company per day. Recruiters see all your applications, so pick the 1 or 2 that fit you best rather than every opening.</li>
            <li>Your target companies get a head start, then other big names like Akuna or Northrop, then everyone else. Roles too senior for a new grad (Associate at banks, Senior, II, III) are filtered out.</li>
            <li>For companies on your list, a referral beats a cold apply. Message a Rutgers alum or an engineer on the team, ideally before you submit.</li>
          </ul>
        </div>
        {feedError && <p className="mt-3 text-sm text-rose-300">Couldn't load roles here. Open the full job tracker instead.</p>}
        {!feed && !feedError && <p className="mt-3 text-sm text-zinc-500">Loading roles…</p>}
        {feed && (
          <ul className="mt-3 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {queue.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-zinc-100">{j.company}</span>
                  {j.tier !== 'other' && <span className={`ml-2 rounded px-1.5 py-px text-[11px] ${j.tier === 'target' ? 'bg-amber-500/15 text-amber-300' : 'bg-violet-500/15 text-violet-300'}`}>{j.tier === 'target' ? 'your list' : 'big company'}</span>}
                  {(days(j) ?? 99) <= 3 && <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-px text-[11px] text-emerald-300">new</span>}
                  <span className="block truncate text-sm text-zinc-400">{j.title} · {j.location}</span>
                  <span className="block text-xs text-zinc-500">{ago(days(j))}</span>
                </div>
                <a href={j.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1 text-sm text-zinc-200 hover:border-zinc-500">Open<ExternalLink size={12} /></a>
                <button onClick={() => markApplied(j)} className="rounded-md bg-violet-600 px-2.5 py-1 text-sm font-medium text-white hover:bg-violet-700">Applied</button>
                <button onClick={() => skip(j)} className="text-sm text-zinc-500 hover:text-zinc-300">Skip</button>
              </li>
            ))}
            {!queue.length && <li className="px-4 py-3 text-sm text-zinc-400">You've worked through every open role in the feed. New ones appear as the tracker finds them.</li>}
          </ul>
        )}
      </section>
    </Card>
  );
}

/** Pattern finder answers given today. Answers before the answer log existed are counted once per problem. */
function finderCountToday(progress: Progress, since: number) {
  const all = finderAnswers();
  const loggedToday = all.filter((a) => a.at >= since);
  const base = getLocal<number | null>(`pyforge.finder.baseline.${today()}`, null);
  if (base != null) return base + loggedToday.length;
  const loggedEver: Record<string, number> = {};
  for (const a of all) loggedEver[a.id] = (loggedEver[a.id] ?? 0) + 1;
  const earlier = Object.entries(progress.cards).filter(([id, c]) => PATTERN_IDS.has(id) && c.lastSeen >= since && c.attempts > (loggedEver[id] ?? 0)).length;
  return earlier + loggedToday.length;
}

/** Today's flashcard deck: due reviews if many are waiting, else the deck your target companies need most. */
function pickDeck(progress: Progress, locked?: string): { id: string; name: string; short: string; why: string } {
  const now = Date.now();
  const due = FLASHCARDS.filter((c) => progress.cards[c.id] && progress.cards[c.id].due <= now).length;
  if (locked === 'due' || (!locked && due >= 8)) return { id: 'due', name: 'your due reviews', short: 'reviews', why: `${due} cards are due for review.` };
  const targets = getLocal<CompanyId[]>('pyforge.targets.v1', []);
  const misses: Record<string, number> = {};
  for (const m of mistakeLog()) if (m.kind.startsWith('card-') && m.at > now - 14 * 86_400_000) misses[m.kind.slice(5)] = (misses[m.kind.slice(5)] ?? 0) + 1;
  const scored = DECKS.map((d) => {
    const cards = FLASHCARDS.filter((c) => c.deck === d.id);
    const m = cards.reduce((a, c) => a + mastery(progress.cards[c.id]), 0) / cards.length;
    const rel = targets.length ? targets.filter((t) => d.companies.includes(t)).length / targets.length : d.companies.length / 13;
    return { d, m, rel, score: rel * 1.2 + (1 - m) + Math.min(1, (misses[d.id] ?? 0) / 5) };
  }).sort((a, b) => b.score - a.score);
  const best = locked ? scored.find((x) => x.d.id === locked) ?? scored[0] : scored[0];
  const who = targets.length ? best.d.companies.filter((c) => targets.includes(c)).map((c) => COMPANY_NAME[c]).slice(0, 3).join(', ') : '';
  return { id: best.d.id, name: best.d.name, short: best.d.name, why: `${who ? `Asked at ${who}. ` : ''}You're at ${Math.round(best.m * 100)}% on this deck${misses[best.d.id] ? ` and missed ${misses[best.d.id]} recently` : ''}.` };
}

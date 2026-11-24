import { BarChart3, BookOpen, Blocks, Briefcase, Bug, Boxes, ClipboardCheck, Compass, GitBranch, GraduationCap, Keyboard, Layers, Map as MapIcon, Moon, Network, Sun, Target, Wrench } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import BlueprintBuilder, { WeakIdioms } from './components/BlueprintBuilder';
import BugHunter from './components/BugHunter';
import Lab from './components/Lab';
import WeakSpots from './components/WeakSpots';
import { ClaudeKeyCard } from './components/AI';
import Coach from './components/Coach';
import Companies from './components/Companies';
import Dashboard from './components/Dashboard';
import DesignStudio from './components/DesignStudio';
import Flashcards from './components/Flashcards';
import Practical from './components/Practical';
import PatternDrill from './components/PatternDrill';
import Patterns from './components/Patterns';
import Roadmap from './components/Roadmap';
import MockOA from './components/MockOA';
import { getUnlockAll, isUnlocked, roadmapStatus, saveUnlockAll, solvedDrillIds } from './lib/roadmap';
import { ReferenceContent, ReferenceDrawer } from './components/Reference';
import StudyPath from './components/StudyPath';
import SyntaxDrill from './components/SyntaxDrill';
import type { NeetcodeStatus } from './lib/cloud';
import { signOut, useAuthUser } from 'deepspace';
import { Cloud, CloudOff, LogOut } from 'lucide-react';
import { useProgressSync } from './useProgressSync';
import { Kbd, PageTitle } from './components/ui';
import { ALL, BUGS, PATTERN_DRILLS, SYNTAX } from './data';
import { COMPANIES, PATTERNS } from './data/meta';
import { buildQueue, emptyProgress, filterItems, getLocal, loadProgress, review, saveProgress, setLocal, streak, updateLesson } from './lib/storage';
import type { CompanyId, LessonState, Mode, PatternId, Progress } from './types';

type NavItem = { id: Mode; label: string; icon: typeof Keyboard; key: string };
const GROUPS: { name: string; items: NavItem[] }[] = [
  { name: '', items: [{ id: 'coach', label: 'Today', icon: Compass, key: 't' }, { id: 'roadmap', label: 'Roadmap', icon: GitBranch, key: 'o' }, { id: 'path', label: 'Study path', icon: MapIcon, key: 'n' }, { id: 'learn', label: 'Patterns', icon: GraduationCap, key: 'l' }] },
  { name: 'Coding drills', items: [
    { id: 'blueprint', label: 'Blueprint builder', icon: Blocks, key: 'u' },
    { id: 'syntax', label: 'Syntax recall', icon: Keyboard, key: 's' },
    { id: 'bug', label: 'Bug hunter', icon: Bug, key: 'b' },
    { id: 'pattern', label: 'Pattern finder', icon: Target, key: 'p' },
    { id: 'practical', label: 'Practical rounds', icon: Boxes, key: 'x' },
    { id: 'oa', label: 'Mock OA', icon: ClipboardCheck, key: 'a' },
  ] },
  { name: 'Engineering skills', items: [
    { id: 'lab', label: 'Build lab', icon: Wrench, key: 'k' },
  ] },
  { name: 'Interview prep', items: [
    { id: 'design', label: 'System design', icon: Network, key: 'd' },
    { id: 'cards', label: 'Flashcards', icon: Layers, key: 'f' },
    { id: 'companies', label: 'Companies', icon: Briefcase, key: 'c' },
  ] },
  { name: 'You', items: [
    { id: 'dashboard', label: 'Stats', icon: BarChart3, key: 'g' },
    { id: 'reference', label: 'Python reference', icon: BookOpen, key: 'r' },
  ] },
];
const ALL_NAV = GROUPS.flatMap((g) => g.items);

const DRILL_INTRO: Partial<Record<Mode, { title: string; sub: string }>> = {
  syntax: { title: 'Syntax recall', sub: 'You know the algorithm. Type the exact Python. Each blank says what it should do, and wrong answers tell you why.' },
  bug: { title: 'Bug hunter', sub: 'Read code like a reviewer. Flag every broken line, then pick the fix. This is the skill AI-assisted and code-comprehension rounds test.' },
  pattern: { title: 'Pattern finder', sub: 'Read a real interview problem and pick the pattern that gives the most efficient solution. Every answer explains the clue, the brute force and the optimal idea.' },
};

const THEME_KEY = 'pyforge.theme';
const readTheme = () => { try { return localStorage.getItem(THEME_KEY) === 'dark'; } catch { return false; } };

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [mode, setMode] = useState<Mode>('coach');
  const [pattern, setPattern] = useState<PatternId | 'all'>('all');
  const [company, setCompany] = useState<CompanyId | 'all'>('all');
  const [deck, setDeck] = useState<string | undefined>();
  const [drawer, setDrawer] = useState(false);
  const [session, setSession] = useState(0);
  const [dark, setDark] = useState(readTheme);
  const [focus, setFocus] = useState<string | undefined>();
  const ncCloud = null as NeetcodeStatus | null;
  const cloud = false;
  const [ncLocal, setNcLocal] = useState<string[]>(() => getLocal('pyforge.neetcode.local', ['duplicate-integer', 'is-anagram', 'two-integer-sum']));
  const [unlockAll, setUnlockAllState] = useState<boolean>(getUnlockAll);
  const setUnlockAll = (v: boolean) => { setUnlockAllState(v); saveUnlockAll(v); setSession((s) => s + 1); };
  const [lessonSel, setLessonSel] = useState<string | undefined>();
  const [ncSyncedAt, setNcSyncedAt] = useState<string | null>(() => getLocal('pyforge.neetcode.syncedAt', null));
  const [pace, setPaceState] = useState<number>(() => getLocal('pyforge.pace', 2));
  const setPace = (n: number) => { setPaceState(n); setLocal('pyforge.pace', n); };
  const solved = useMemo(() => new Set(ncCloud ? ncCloud.solved : ncLocal), [ncCloud, ncLocal]);
  const toggleLocal = (slug: string) => setNcLocal((xs) => {
    const next = xs.includes(slug) ? xs.filter((x) => x !== slug) : [...xs, slug];
    setLocal('pyforge.neetcode.local', next);
    return next;
  });

  // NeetCode sync for the standalone site: the bookmark (or the hourly task in Chrome) opens #nc=slug,slug,...
  useEffect(() => {
    const read = () => {
      const m = location.hash.match(/^#nc=([a-z0-9,-]*)$/);
      if (!m) return;
      const slugs = m[1].split(',').filter(Boolean);
      setNcLocal(slugs); setLocal('pyforge.neetcode.local', slugs);
      const at = new Date().toISOString();
      setNcSyncedAt(at); setLocal('pyforge.neetcode.syncedAt', at);
      history.replaceState(null, '', location.pathname + location.search);
      setMode('path');
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  // DeepSpace: progress lives in the signed-in user's `progress` record and syncs live across devices.
  const sync = useProgressSync(progress, setProgress);
  const { user } = useAuthUser();
  useEffect(() => { saveProgress(progress); }, [progress]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [dark]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [mode]);

  const onResult = useCallback((id: string, q: 0 | 1 | 2 | 3, tags: string[]) => setProgress((p) => review(p, id, q, tags)), []);
  const onLesson = useCallback((id: string, patch: (s: LessonState) => LessonState) => setProgress((p) => updateLesson(p, id, patch)), []);
  const learn = (id?: string) => { setLessonSel(id); setMode('learn'); setSession((s) => s + 1); };

  // Drills unlock as you learn patterns and solve NeetCode problems (see the Roadmap).
  const road = useMemo(() => roadmapStatus(progress, solved), [progress, solved]);
  const viaSolved = useMemo(() => solvedDrillIds(solved, ALL), [solved]);
  const unlocked = useCallback(<T extends { id: string; pattern: PatternId; kind: string }>(xs: T[]) =>
    unlockAll ? xs : xs.filter((e) => e.id === focus || isUnlocked(e as never, road, viaSolved)), [unlockAll, road, viaSolved, focus]);
  const queues = useMemo(() => {
    const front = <T extends { id: string }>(q: T[]) => (focus ? [...q.filter((e) => e.id === focus), ...q.filter((e) => e.id !== focus)] : q);
    return {
      syntax: front(buildQueue(unlocked(filterItems(SYNTAX, pattern, company)), progress)),
      bug: front(buildQueue(unlocked(filterItems(BUGS, pattern, company)), progress)),
      pattern: front(buildQueue(unlocked(filterItems(PATTERN_DRILLS, pattern, company)), progress)),
    };
  }, [pattern, company, session, mode, focus, unlockAll]);  
  const lockedCount = (m: 'syntax' | 'bug' | 'pattern') => {
    const src = m === 'syntax' ? SYNTAX : m === 'bug' ? BUGS : PATTERN_DRILLS;
    return filterItems(src as never[], pattern, company).length - queues[m].length;
  };

  const open = (m: Mode, opts: { deck?: string; company?: CompanyId | 'all'; pattern?: PatternId | 'all'; focus?: string } = {}) => {
    setFocus(opts.focus);
    if (opts.focus && opts.company === undefined) setCompany('all');
    if (opts.company !== undefined) setCompany(opts.company);
    if (opts.pattern !== undefined) setPattern(opts.pattern);
    setDeck(opts.deck);
    setMode(m);
    setSession((s) => s + 1);
  };
  const go = (m: Mode, pat: PatternId | 'all' = pattern, comp: CompanyId | 'all' = company) => open(m, { pattern: pat, company: comp });
  const nav = (m: Mode) => { setDeck(undefined); setFocus(undefined); if (m === 'learn') setLessonSel(undefined); setMode(m); };

  useEffect(() => {
    let g = false;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setDrawer((d) => !d); return; }
      if (e.key === '?') { setDrawer((d) => !d); return; }
      if (e.key === 'Escape') { setDrawer(false); return; }
      if (g) {
        const item = ALL_NAV.find((n) => n.key === e.key);
        if (item) { setDeck(undefined); setMode(item.id); }
        g = false;
        return;
      }
      if (e.key === 'g') { g = true; setTimeout(() => (g = false), 800); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const showFilters = mode === 'syntax' || mode === 'bug' || mode === 'pattern' || mode === 'cards' || mode === 'design';
  const showPattern = mode === 'syntax' || mode === 'bug' || mode === 'pattern';
  const filterKey = `${pattern}|${company}|${session}`;
  const days = streak(progress.days);

  const body = () => {
    switch (mode) {
      case 'coach': return <Coach progress={progress} open={open} solved={solved} onLearn={learn} />;
      case 'path': return <StudyPath progress={progress} solved={solved} syncedAt={ncCloud?.updatedAt ?? ncSyncedAt} cloud={cloud && !!ncCloud} pace={pace} setPace={setPace} toggleLocal={toggleLocal} open={open} />;
      case 'oa': return <MockOA />;
      case 'blueprint': return <BlueprintBuilder key={session} initial={focus} />;
      case 'lab': return <Lab key={session} initial={focus} />;
      case 'roadmap': return <Roadmap progress={progress} solved={solved} unlockAll={unlockAll} setUnlockAll={setUnlockAll} open={open} onLearn={learn} />;
      case 'learn': return <Patterns key={`${lessonSel}-${session}`} progress={progress} solved={solved} initial={lessonSel} onLesson={onLesson} open={open} />;
      case 'dashboard': return <><PageTitle sub="Every attempt and every slip, across all modes.">Stats</PageTitle><div className="mb-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]"><WeakSpots progress={progress} open={open} onLearn={learn} limit={12} /><ClaudeKeyCard /></div><Dashboard progress={progress} solved={solved} go={go} reset={() => setProgress(emptyProgress())} /></>;
      case 'companies': return <Companies key={company} progress={progress} solved={solved} initial={company} open={open} onLearn={learn} />;
      case 'design': return <DesignStudio key={company} progress={progress} company={company} onResult={onResult} />;
      case 'cards': return <Flashcards key={`${company}-${deck}-${session}`} progress={progress} company={company} initialDeck={deck} onResult={onResult} />;
      case 'practical': return <Practical key={session} initial={focus} />;
      case 'reference': return <><PageTitle sub="Exact method names and their costs. Open it from anywhere with ? or Ctrl K.">Python reference</PageTitle><div className="max-w-4xl"><ReferenceContent autoFocus /></div></>;
      default: {
        const intro = DRILL_INTRO[mode]!;
        const q = queues[mode as 'syntax' | 'bug' | 'pattern'];
        return (
          <>
            <PageTitle sub={intro.sub}>{intro.title}</PageTitle>
            {!unlockAll && lockedCount(mode as 'syntax') > 0 && (
              <p className="-mt-2 mb-5 text-sm text-zinc-500">
                {q.length} unlocked, {lockedCount(mode as 'syntax')} still locked behind patterns you haven't reached.{' '}
                <button onClick={() => nav('roadmap')} className="text-violet-300 hover:underline">See what unlocks them</button>
              </p>
            )}
            {!q.length ? (
              <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center">
                <p className="text-zinc-200">Nothing unlocked here yet{pattern !== 'all' || company !== 'all' ? ' for these filters' : ''}.</p>
                <p className="mt-1 text-sm text-zinc-500">Read a pattern lesson or solve a NeetCode problem to unlock its drills.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={() => nav('roadmap')} className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white">Open the roadmap</button>
                  <button onClick={() => setUnlockAll(true)} className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300">Unlock everything</button>
                </div>
              </div>
            )
              : mode === 'syntax' ? <><SyntaxDrill key={filterKey} queue={queues.syntax} onResult={onResult} /><div className="mt-8 max-w-xl"><WeakIdioms compact /></div></>
              : mode === 'bug' ? <BugHunter key={filterKey} queue={queues.bug} onResult={onResult} />
              : <PatternDrill key={filterKey} queue={queues.pattern} progress={progress} filterId={`${pattern}|${company}`} onResult={onResult} onLearn={learn} />}
          </>
        );
      }
    }
  };

  const selectCls = 'rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[15px] text-zinc-200 outline-none focus:border-violet-500';

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-900/85 px-3 py-5 backdrop-blur md:flex">
        <button onClick={() => nav('coach')} className="mb-7 px-2 text-left">
          <div className="text-[26px] font-extrabold leading-none tracking-[-0.04em] text-zinc-100">py<span className="text-violet-400">forge</span></div>
          <div className="mt-1 text-sm text-zinc-500">new grad interview gym</div>
        </button>
        <nav className="space-y-5">
          {GROUPS.map((g) => (
            <div key={g.name || 'home'}>
              {g.name && <div className="mb-1 px-2 text-[13px] font-medium text-zinc-500">{g.name}</div>}
              {g.items.map((n) => (
                <button key={n.id} onClick={() => nav(n.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[15px] transition-colors ${mode === n.id ? 'bg-zinc-950 font-semibold text-zinc-100 shadow-[inset_3px_0_0_rgb(var(--hl-500))]' : 'text-zinc-400 hover:text-zinc-100'}`}>
                  <n.icon size={16} strokeWidth={mode === n.id ? 2.3 : 1.8} />
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto space-y-3 px-2 pt-6">
          {user && (
            <div className="border-t border-zinc-800 pt-3 text-sm">
              <div className="truncate font-medium text-zinc-200" title={user.primaryEmailAddress?.emailAddress}>{user.fullName || user.primaryEmailAddress?.emailAddress}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500" data-testid="sync-state">
                {sync === 'error' ? <CloudOff size={13} className="text-rose-400" /> : <Cloud size={13} className={sync === 'synced' ? 'text-emerald-400' : 'text-zinc-500'} />}
                {sync === 'synced' ? 'Progress synced' : sync === 'saving' ? 'Saving…' : sync === 'loading' ? 'Connecting…' : 'Sync error, saved on this device'}
              </div>
              <button onClick={() => { void signOut().then(() => { location.href = '/'; }); }} className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200"><LogOut size={12} />Sign out</button>
            </div>
          )}
          {days > 0 && <p className="text-sm text-zinc-400"><span className="hl font-semibold text-zinc-100">{days}-day streak</span></p>}
          <button onClick={() => setDrawer(true)} className="flex w-full items-center justify-between text-sm text-zinc-400 hover:text-zinc-100">Python cheat sheet <Kbd>?</Kbd></button>
          <button onClick={() => setDark((d) => !d)} className="flex w-full items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100">
            {dark ? <Sun size={15} /> : <Moon size={15} />}{dark ? 'Paper mode' : 'Night mode'}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className={`sticky top-0 z-30 bg-zinc-950/90 backdrop-blur ${showFilters ? 'border-b border-zinc-800' : 'md:hidden'}`}>
          <div className="flex items-center gap-1 overflow-x-auto px-3 py-2 md:hidden">
            {ALL_NAV.map((n) => (
              <button key={n.id} onClick={() => nav(n.id)} className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-sm ${mode === n.id ? 'bg-zinc-900 font-semibold text-zinc-100' : 'text-zinc-400'}`}>
                <n.icon size={14} />{n.label}
              </button>
            ))}
            <button onClick={() => setDark((d) => !d)} aria-label="Toggle theme" className="ml-1 shrink-0 p-1 text-zinc-400">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
          </div>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 px-6 py-2.5">
              <span className="text-sm text-zinc-500">Focus</span>
              <select value={company} onChange={(e) => go(mode, pattern, e.target.value as CompanyId | 'all')} className={selectCls} aria-label="Company">
                <option value="all">All companies</option>
                <optgroup label="Quant">{COMPANIES.filter((c) => c.tier === 'quant').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                <optgroup label="Big tech and AI">{COMPANIES.filter((c) => c.tier === 'bigtech').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                <optgroup label="Banks">{COMPANIES.filter((c) => c.tier === 'bank').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
              </select>
              {showPattern && (
                <select value={pattern} onChange={(e) => go(mode, e.target.value as PatternId | 'all', company)} className={selectCls} aria-label="Pattern">
                  <option value="all">All 18 patterns</option>
                  {PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
          )}
        </header>
        <div className={`mx-auto px-6 py-8 ${mode === 'blueprint' ? 'max-w-[1600px]' : 'max-w-[1180px]'}`}>{body()}</div>
      </main>

      <ReferenceDrawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}

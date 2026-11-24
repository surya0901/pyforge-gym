import { AlertTriangle, Bug, Copy, Flame, Gauge, Keyboard, RotateCcw, Target, Trophy } from 'lucide-react';
import { useState } from 'react';
import { ALL } from '../data';
import { COMPANIES, PATTERNS } from '../data/meta';
import { averageMastery, mastery, streak } from '../lib/storage';
import type { CompanyId, Mode, PatternId, Progress } from '../types';
import { Bar, Button, Card } from './ui';
import { WeakIdioms } from './BlueprintBuilder';
import { allPrep } from '../lib/prep';

export const MISTAKE_LABEL: Record<string, string> = {
  'bool-case': 'true/false instead of True/False',
  none: 'null/none instead of None',
  'logic-ops': '&& / || / ! instead of and/or/not',
  incr: 'x++ / x--',
  self: 'this. instead of self.',
  len: '.length / .size() instead of len()',
  'set-append': '.append() on a set',
  'list-add': '.add() on a list',
  push: '.push() (not Python)',
  'heapq-name': 'heapq.push/pop names',
  'heapq-method': 'heap.heappush (method style)',
  'heapq-prefix': 'heappush without heapq.',
  'heapq-args': 'heappush missing heap arg',
  'empty-set': '{} used as empty set',
  'alias-2d': '[[0]*n]*m row aliasing',
  'deque-pop': 'pop() / pop(0) instead of popleft()',
  'popleft-stack': 'popleft() on a stack',
  'deque-iter': 'deque(x) without a list',
  'alias-path': 'appending path without copy',
  'int-div': '/ instead of //',
  'floor-trunc': '// vs truncation',
  'bisect-side': 'bisect_left vs bisect_right',
  'sorted-discard': 'sorted() result discarded',
  'sort-none': '.sort() used as a value',
  'off-by-one-cmp': '< vs <= boundary',
  'off-by-one': '±1 off-by-one',
  case: 'capitalization',
  parens: 'parentheses / precedence',
  'inf-quotes': "float(inf) without quotes",
  'bug-missed': 'Bug Hunter: missed buggy line',
  'bug-false-flag': 'Bug Hunter: flagged a correct line',
  'bug-wrong-fix': 'Bug Hunter: wrong fix',
  'pattern-miss': 'Pattern drill: wrong pattern',
  'ds-miss': 'Pattern drill: wrong data structure',
  timeout: 'Pattern drill: timed out',
};

interface Props {
  progress: Progress;
  solved: Set<string>;
  go: (m: Mode, pattern?: PatternId | 'all', company?: CompanyId | 'all') => void;
  reset: () => void;
}

export default function Dashboard({ progress, solved, go, reset }: Props) {
  const prep = allPrep(progress, solved);
  const cards = progress.cards;
  const attempted = Object.values(cards);
  const mastered = ALL.filter((e) => mastery(cards[e.id]) >= 0.8).length;
  const due = ALL.filter((e) => cards[e.id] && cards[e.id].due <= Date.now()).length;
  const totalAttempts = attempted.reduce((s, c) => s + c.attempts, 0);
  const acc = totalAttempts ? attempted.reduce((s, c) => s + c.correct, 0) / totalAttempts : 0;

  const patternStats = PATTERNS.map((p) => {
    const items = ALL.filter((e) => e.pattern === p.id);
    const tries = items.reduce((s, e) => s + (cards[e.id]?.attempts ?? 0), 0);
    const right = items.reduce((s, e) => s + (cards[e.id]?.correct ?? 0), 0);
    return { ...p, count: items.length, mastery: averageMastery(items, progress), tries, accuracy: tries ? right / tries : 0 };
  });
  const weakest = patternStats.filter((p) => p.tries >= 2).sort((a, b) => a.accuracy - b.accuracy || a.mastery - b.mastery).slice(0, 3);
  const untouched = patternStats.filter((p) => p.tries === 0);
  const mistakes = Object.entries(progress.mistakes).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState(false);
  const exportJson = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(progress)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ }
  };

  const stats = [
    { icon: Flame, label: 'Day streak', value: streak(progress.days), color: 'text-orange-400' },
    { icon: Trophy, label: 'Mastered', value: `${mastered}/${ALL.length}`, color: 'text-emerald-400' },
    { icon: RotateCcw, label: 'Due for review', value: due, color: 'text-sky-400' },
    { icon: Gauge, label: 'Accuracy', value: totalAttempts ? `${Math.round(acc * 100)}%` : '—', color: 'text-violet-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400"><s.icon size={14} className={s.color} />{s.label}</div>
            <div className="mt-1 tnum text-3xl font-bold text-zinc-100">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-100"><AlertTriangle size={15} className="text-amber-400" />Weakest patterns</h3>
          <p className="mb-4 text-xs text-zinc-500">Lowest accuracy across all modes (min. 2 attempts).</p>
          {weakest.length === 0 ? (
            <p className="text-sm text-zinc-400">Do a few drills and your weak spots show up here.</p>
          ) : (
            <ul className="space-y-3">
              {weakest.map((p) => (
                <li key={p.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-zinc-200">{p.name}</span>
                    <span className="font-mono text-xs text-rose-300">{Math.round(p.accuracy * 100)}%</span>
                  </div>
                  <Bar value={p.accuracy} color="bg-rose-500" />
                  <div className="mt-2 flex gap-1">
                    <Button variant="subtle" className="!px-2 !py-1 text-xs" onClick={() => go('syntax', p.id)}><Keyboard size={12} />Syntax</Button>
                    <Button variant="subtle" className="!px-2 !py-1 text-xs" onClick={() => go('bug', p.id)}><Bug size={12} />Bugs</Button>
                    <Button variant="subtle" className="!px-2 !py-1 text-xs" onClick={() => go('pattern', p.id)}><Target size={12} />Recognize</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {untouched.length > 0 && (
            <p className="mt-4 text-xs text-zinc-500">Not started: {untouched.map((u) => u.short).join(', ')}</p>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-zinc-100">Company readiness</h3>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {COMPANIES.map((c) => {
              const m = prep[c.id].overall;
              return (
                <button key={c.id} onClick={() => go('companies', 'all', c.id)} className="group text-left">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-zinc-300 group-hover:text-white">
                      {c.name}
                      <span className={`ml-2 rounded px-1 text-[10px] ${c.tier === 'quant' ? 'bg-amber-500/10 text-amber-300' : 'bg-sky-500/10 text-sky-300'}`}>{c.tier === 'quant' ? 'QUANT' : c.tier === 'bank' ? 'BANK' : 'BIG TECH'}</span>
                    </span>
                    <span className="font-mono text-xs text-zinc-400">{Math.round(m * 100)}%</span>
                  </div>
                  <Bar value={m} color={c.tier === 'quant' ? 'bg-amber-500' : 'bg-sky-500'} />
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-zinc-100">Pattern mastery</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {patternStats.map((p) => (
              <button key={p.id} onClick={() => go('syntax', p.id)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition-colors hover:border-violet-500/50">
                <div className="mb-2 flex items-center justify-between">
                  <span className="truncate text-xs font-medium text-zinc-200">{p.name}</span>
                  <span className="ml-2 font-mono text-[11px] text-zinc-500">{p.count}</span>
                </div>
                <Bar value={p.mastery} color={p.mastery > 0.7 ? 'bg-emerald-500' : 'bg-violet-500'} />
                <div className="mt-1.5 truncate font-mono text-[10px] text-zinc-500">{p.tools}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-100">Your recurring slips</h3>
          {mistakes.length === 0 ? (
            <p className="text-sm text-zinc-400">No mistakes logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {mistakes.map(([tag, n]) => (
                <li key={tag} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-300">{MISTAKE_LABEL[tag] ?? (tag.startsWith('card-miss-') ? `Flashcards: missed a ${tag.slice(10)} card` : tag === 'design-miss' ? 'System design: missed most of a problem' : tag.startsWith('design-axis:') ? `System design: weak on ${tag.slice(12).replace('_', ' ')}` : tag)}</span>
                  <span className="rounded bg-rose-500/10 px-1.5 font-mono text-xs text-rose-300">×{n}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex gap-2 border-t border-zinc-800 pt-4">
            <Button variant="ghost" onClick={exportJson}><Copy size={14} />{copied ? 'Copied' : 'Copy progress'}</Button>
            <Button variant="ghost" onClick={() => { if (armed) { reset(); setArmed(false); } else { setArmed(true); setTimeout(() => setArmed(false), 3000); } }}><RotateCcw size={14} />{armed ? 'Click again to erase' : 'Reset'}</Button>
          </div>
        </Card>
        <WeakIdioms />
      </div>
    </div>
  );
}

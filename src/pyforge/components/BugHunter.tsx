import { Bug, CheckCircle2, Crosshair, Wrench, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { normalize, shuffle } from '../lib/check';
import { highlight } from '../lib/highlight';
import type { BugExercise } from '../types';
import { Button, Card, ExerciseHeader, Kbd } from './ui';

interface Props {
  queue: BugExercise[];
  onResult: (id: string, quality: 0 | 1 | 2 | 3, tags: string[]) => void;
}

type Phase = 'select' | 'fix' | 'done';

export default function BugHunter({ queue, onResult }: Props) {
  const [idx, setIdx] = useState(0);
  const ex = queue[idx % Math.max(queue.length, 1)];
  const [phase, setPhase] = useState<Phase>('select');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [choice, setChoice] = useState<Record<number, string>>({});
  const [typed, setTyped] = useState<Record<number, string>>({});

  useEffect(() => {
    setPhase('select');
    setSelected(new Set());
    setChoice({});
    setTyped({});
  }, [ex?.id, idx]);

  const options = useMemo(() => (ex ? Object.fromEntries(ex.bugs.map((b) => [b.line, shuffle(b.options)])) : {}), [ex, idx]);  
  const bugLines = useMemo(() => new Set(ex?.bugs.map((b) => b.line) ?? []), [ex]);

  const fixRight = useCallback((line: number) => {
    const b = ex!.bugs.find((x) => x.line === line)!;
    const t = typed[line]?.trim();
    if (t) return normalize(t) === normalize(b.options[0]);
    return choice[line] === b.options[0];
  }, [ex, typed, choice]);

  if (!ex) return null;
  const lines = ex.code.split('\n');

  const found = [...selected].filter((l) => bugLines.has(l));
  const falseFlags = [...selected].filter((l) => !bugLines.has(l));
  const missed = ex.bugs.filter((b) => !selected.has(b.line));

  const lockIn = () => {
    if (selected.size === 0) return;
    setPhase('fix');
  };

  const submitFixes = () => {
    const wrongFixes = ex.bugs.filter((b) => !fixRight(b.line));
    const tags: string[] = [];
    if (missed.length) tags.push('bug-missed');
    if (falseFlags.length) tags.push('bug-false-flag');
    if (wrongFixes.length) tags.push('bug-wrong-fix');
    const quality: 0 | 1 | 2 = missed.length ? 0 : wrongFixes.length || falseFlags.length ? 1 : 2;
    onResult(ex.id, quality, tags);
    setPhase('done');
  };

  const next = () => setIdx((i) => i + 1);
  const allChosen = ex.bugs.every((b) => choice[b.line] || typed[b.line]?.trim());

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') {
      if (e.key !== 'Enter') return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'select') lockIn();
      else if (phase === 'fix' && allChosen) submitFixes();
      else if (phase === 'done') next();
    }
  };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useKey(onKeyDown);

  const toggle = (ln: number) => {
    if (phase !== 'select') return;
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(ln)) n.delete(ln); else n.add(ln);
      return n;
    });
  };

  const lineClass = (ln: number) => {
    const sel = selected.has(ln);
    if (phase === 'select') return sel ? 'bg-rose-500/10 shadow-[inset_3px_0_0_rgb(var(--pen-500))] cursor-pointer' : 'hover:bg-zinc-800/50 cursor-pointer';
    if (bugLines.has(ln)) return sel ? 'bg-amber-500/30 shadow-[inset_3px_0_0_rgb(var(--ok-500))]' : 'bg-amber-500/30 shadow-[inset_3px_0_0_rgb(var(--hl-600))]';
    return sel ? 'bg-rose-500/10 line-through decoration-rose-500/60' : '';
  };

  return (
    <div>
      <ExerciseHeader title={ex.title} pattern={ex.pattern} difficulty={ex.difficulty} companies={ex.companies} index={idx % queue.length} total={queue.length} />
      <p className="mb-1 max-w-[65ch] text-zinc-400">{ex.prompt}</p>
      <p className="mb-4 text-xs text-zinc-500">
        Contains <span className="text-zinc-300">{ex.bugs.length === 1 ? '1 bug' : `${ex.bugs.length} bugs`}</span>.
        {phase === 'select' && ' Click every buggy line, then lock in.'}
      </p>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-x-auto py-3">
          <div className="font-mono text-[13.5px] leading-[1.75]">
            {lines.map((l, i) => {
              const ln = i + 1;
              return (
                <div key={i} onClick={() => toggle(ln)} className={`flex whitespace-pre px-2 transition-colors ${lineClass(ln)}`}>
                  <span className="w-8 shrink-0 select-none pr-3 text-right text-zinc-600">{ln}</span>
                  <span>{highlight(l, `${i}-`)}</span>
                  {phase !== 'select' && bugLines.has(ln) && <Bug size={13} className="ml-auto mt-1 shrink-0 text-amber-400" />}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-3">
          {phase === 'select' && (
            <Card className="p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100"><Crosshair size={15} className="text-rose-400" />Flag the lines</h4>
              <p className="mb-3 text-sm text-zinc-400">Selected: {selected.size ? [...selected].sort((a, b) => a - b).map((l) => `L${l}`).join(', ') : 'none'}</p>
              <Button onClick={lockIn} disabled={!selected.size}>Lock in</Button>
            </Card>
          )}

          {phase !== 'select' && (
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap gap-3 text-xs">
                <span className="text-emerald-300">Found {found.length}/{ex.bugs.length}</span>
                {missed.length > 0 && <span className="text-amber-300">Missed: {missed.map((m) => `L${m.line}`).join(', ')}</span>}
                {falseFlags.length > 0 && <span className="text-rose-300">False flags: {falseFlags.map((l) => `L${l}`).join(', ')}</span>}
              </div>
              <div className="space-y-4">
                {ex.bugs.map((b) => {
                  const right = phase === 'done' && fixRight(b.line);
                  return (
                    <div key={b.line} className="rounded-lg border border-zinc-800 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
                        <Wrench size={14} className="text-violet-400" />Fix line {b.line}
                        {phase === 'done' && (right ? <CheckCircle2 size={15} className="ml-auto text-emerald-400" /> : <XCircle size={15} className="ml-auto text-rose-400" />)}
                      </div>
                      <div className="space-y-1.5">
                        {options[b.line]?.map((o) => {
                          const picked = choice[b.line] === o && !typed[b.line]?.trim();
                          const isAns = o === b.options[0];
                          const cls = phase === 'done'
                            ? isAns ? 'border-emerald-500/60 bg-emerald-500/10' : picked ? 'border-rose-500/60 bg-rose-500/10' : 'border-zinc-800 opacity-60'
                            : picked ? 'border-violet-500 bg-violet-500/10' : 'border-zinc-800 hover:border-zinc-600';
                          return (
                            <button key={o} disabled={phase === 'done'} onClick={() => { setChoice((c) => ({ ...c, [b.line]: o })); setTyped((t) => ({ ...t, [b.line]: '' })); }}
                              className={`block w-full overflow-x-auto whitespace-pre rounded-md border px-2 py-1.5 text-left font-mono text-[12px] transition-colors ${cls}`}>
                              {highlight(o.trimStart(), `${b.line}-${o}-`)}
                            </button>
                          );
                        })}
                        <input
                          disabled={phase === 'done'}
                          value={typed[b.line] ?? ''}
                          onChange={(e) => setTyped((t) => ({ ...t, [b.line]: e.target.value }))}
                          placeholder="…or type the fixed line"
                          spellCheck={false}
                          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-[12px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-violet-500"
                        />
                      </div>
                      {phase === 'done' && <p className="mt-2 text-xs leading-relaxed text-zinc-400"><span className="text-amber-300">Why it breaks: </span>{b.explanation}</p>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                {phase === 'fix' ? (
                  <Button onClick={submitFixes} disabled={!allChosen}><CheckCircle2 size={15} />Check fixes</Button>
                ) : (
                  <Button onClick={next}>Next</Button>
                )}
              </div>
            </Card>
          )}
          <p className="text-xs text-zinc-500"><Kbd>Click</Kbd> toggle line · <Kbd>Enter</Kbd> lock in / check / next</p>
        </div>
      </div>
    </div>
  );
}

function useKey(handler: (e: KeyboardEvent) => void) {
  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
}

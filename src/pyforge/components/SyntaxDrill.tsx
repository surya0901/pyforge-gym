import { CheckCircle2, Eye, Lightbulb, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { diagnose, matches, type Diagnostic } from '../lib/check';
import { highlight } from '../lib/highlight';
import type { SyntaxExercise } from '../types';
import { Button, Card, ExerciseHeader, Kbd } from './ui';

interface Props {
  queue: SyntaxExercise[];
  onResult: (id: string, quality: 0 | 1 | 2 | 3, tags: string[]) => void;
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨';

export default function SyntaxDrill({ queue, onResult }: Props) {
  const [idx, setIdx] = useState(0);
  const ex = queue[idx % Math.max(queue.length, 1)];
  const [inputs, setInputs] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [diags, setDiags] = useState<Diagnostic[][]>([]);
  const [focus, setFocus] = useState(0);
  const started = useRef(Date.now());
  const recorded = useRef(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!ex) return;
    setInputs(ex.blanks.map(() => ''));
    setChecked(false);
    setRevealed(false);
    setResults([]);
    setDiags([]);
    setFocus(0);
    started.current = Date.now();
    recorded.current = false;
    setTimeout(() => refs.current[0]?.focus(), 0);
  }, [ex?.id, idx]);  

  const lines = useMemo(() => (ex ? ex.code.split('\n') : []), [ex]);

  if (!ex) return null;

  const check = () => {
    const res = ex.blanks.map((b, i) => matches(inputs[i] ?? '', b.answers));
    const d = ex.blanks.map((b, i) => (res[i] ? [] : diagnose(inputs[i] ?? '', b.answers)));
    setResults(res);
    setDiags(d);
    setChecked(true);
    const all = res.every(Boolean);
    const secs = (Date.now() - started.current) / 1000;
    const quality = all ? (secs < ex.blanks.length * 12 ? 3 : 2) : 0;
    const tags = d.flat().map((x) => x.tag).filter((t) => t !== 'other' && t !== 'empty');
    if (!recorded.current) onResult(ex.id, quality, tags); // only the first attempt counts
    recorded.current = true;
    const firstWrong = res.findIndex((r) => !r);
    if (firstWrong >= 0) setTimeout(() => refs.current[firstWrong]?.select(), 0);
  };

  const reveal = () => {
    if (!recorded.current) onResult(ex.id, 0, []);
    recorded.current = true;
    setInputs(ex.blanks.map((b) => b.answers.find((a) => !a.startsWith('re:')) ?? ''));
    setResults(ex.blanks.map(() => true));
    setDiags([]);
    setChecked(true);
    setRevealed(true);
  };

  const next = () => setIdx((i) => i + 1);
  const allRight = checked && results.every(Boolean);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (allRight) next();
      else check();
    }
  };

  const renderLine = (line: string, li: number) => {
    const parts = line.split(/__(\d+)__/);
    return (
      <div key={li} className="flex min-h-[1.6rem] items-center whitespace-pre">
        <span className="w-8 shrink-0 select-none pr-3 text-right text-zinc-600">{li + 1}</span>
        <span>
          {parts.map((part, pi) => {
            if (pi % 2 === 0) return <span key={pi}>{highlight(part, `${li}-${pi}-`)}</span>;
            const bi = Number(part);
            const blank = ex.blanks[bi];
            const longest = Math.max(...blank.answers.filter((a) => !a.startsWith('re:')).map((a) => a.length), 6);
            const state = !checked ? 'idle' : results[bi] ? 'ok' : 'bad';
            const ring = {
              idle: focus === bi ? 'border-violet-500 bg-amber-500/25' : 'border-dashed border-zinc-600 bg-zinc-950',
              ok: 'border-transparent bg-amber-500/45 text-zinc-50',
              bad: 'border-rose-500 bg-rose-500/10 text-rose-300 pen',
            }[state];
            return (
              <span key={pi} className="relative inline-flex items-center">
                <sup className="mr-0.5 select-none text-[11px] font-semibold text-violet-400">{CIRCLED[bi]}</sup>
                <input
                  ref={(el) => { refs.current[bi] = el; }}
                  value={inputs[bi] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setInputs((prev) => prev.map((x, i) => (i === bi ? v : x)));
                  }}
                  onFocus={() => setFocus(bi)}
                  onKeyDown={onKey}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  readOnly={revealed}
                  style={{ width: `${longest + 2}ch` }}
                  className={`rounded-[3px] border px-1 py-0 font-mono text-[13.5px] text-zinc-100 outline-none transition-colors ${ring}`}
                />
              </span>
            );
          })}
        </span>
      </div>
    );
  };

  return (
    <div>
      <ExerciseHeader title={ex.title} pattern={ex.pattern} difficulty={ex.difficulty} companies={ex.companies} index={idx % queue.length} total={queue.length} />
      <p className="mb-5 max-w-[65ch] text-zinc-400">{ex.prompt}</p>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-x-auto p-4">
          <div className="font-mono text-[13.5px] leading-[1.75]">{lines.map(renderLine)}</div>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <h4 className="mb-2 flex items-center gap-2 font-semibold text-zinc-200"><Lightbulb size={16} className="text-amber-400" />What each blank should do</h4>
            <ol className="space-y-2">
              {ex.blanks.map((b, i) => (
                <li key={i} onClick={() => refs.current[i]?.focus()}
                  className={`cursor-pointer rounded-md border-l-2 py-1.5 pl-3 pr-2 text-sm transition-colors ${focus === i ? 'border-amber-500 bg-amber-500/10 text-zinc-100' : 'border-transparent text-zinc-400 hover:bg-zinc-800/40'}`}>
                  <div className="flex gap-2">
                    <span className="text-violet-400">{CIRCLED[i]}</span>
                    <span>{b.intent}</span>
                    {checked && (results[i] ? <CheckCircle2 size={15} className="ml-auto shrink-0 text-emerald-400" /> : <XCircle size={15} className="ml-auto shrink-0 text-rose-400" />)}
                  </div>
                  {checked && !results[i] && (
                    <div className="mt-2 space-y-1 pl-6">
                      {diags[i]?.map((d, k) => <p key={k} className="text-xs text-amber-300">{d.message}</p>)}
                      <p className="text-xs text-zinc-500">Expected <span className="hl font-mono text-zinc-100">{b.answers.find((a) => !a.startsWith('re:'))}</span></p>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            {ex.note && <p className="mt-3 border-t border-zinc-800 pt-3 text-xs text-zinc-500">{ex.note}</p>}
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            {!allRight ? (
              <Button onClick={check}><CheckCircle2 size={15} />Check</Button>
            ) : (
              <Button onClick={next}>Next</Button>
            )}
            {!allRight && <Button variant="ghost" onClick={reveal}><Eye size={15} />Reveal</Button>}
            {checked && !allRight && <Button variant="ghost" onClick={next}>Skip</Button>}
          </div>
          {allRight && !revealed && <p className="text-emerald-300"><span className="hl">Every blank correct.</span></p>}
          <p className="text-xs text-zinc-500"><Kbd>Tab</Kbd> next blank · <Kbd>Enter</Kbd> check / next</p>
        </div>
      </div>
    </div>
  );
}

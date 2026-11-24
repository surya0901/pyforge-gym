import { Lightbulb, Mic, MicOff, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { stem } from '../lib/cardGrade';
import type { SampleFn } from '../lib/cloud';
import { aiName } from '../lib/cloud';
import { useSpeech } from '../lib/speech';
import type { Blueprint } from '../types';
import { Button, Card } from './ui';

export interface PlanStep { text: string; note?: string; ok?: boolean; clue?: string; template?: string; code?: string; refStep?: number }
export interface PlanReview { verdict: 'optimal' | 'works_but_slow' | 'wrong' | 'incomplete' | 'looks_good' | 'missing'; feedback: string; complexity?: string; optimal?: string; steps: PlanStep[]; byAI?: boolean }

const VERDICT: Record<PlanReview['verdict'], [string, string]> = {
  optimal: ['Optimal plan', 'text-emerald-300 border-emerald-500/40'],
  looks_good: ['Plan covers the optimal solution', 'text-emerald-300 border-emerald-500/40'],
  works_but_slow: ['Works, but not optimal', 'text-amber-300 border-amber-500/40'],
  missing: ['Missing a piece', 'text-amber-300 border-amber-500/40'],
  incomplete: ['Missing a piece', 'text-amber-300 border-amber-500/40'],
  wrong: ['This plan gives wrong answers', 'text-rose-300 border-rose-500/40'],
};

const words = (t: string) => new Set((t.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length > 2).map(stem));
const SLOW = [
  { re: /\b(every|each|all) pairs?\b|nested loop|two loops|compare (each|every)|for each .* for each/i, msg: 'Checking every pair is O(N²).' },
  { re: /\bsort/i, msg: 'Sorting costs O(N log N).' },
  { re: /\bevery (sub ?array|substring|window)\b|all (subarrays|substrings)/i, msg: 'Trying every subarray or substring is O(N²) or worse.' },
];

/** Offline review: match each of your lines to the optimal solution's steps by meaning words. */
export function reviewOffline(p: Blueprint, lines: string[]): PlanReview {
  const refWords = p.steps.map((s) => words(`${s.text} ${s.clue}`));
  const steps: PlanStep[] = lines.map((text) => {
    const w = words(text);
    let best = -1, score = 0;
    refWords.forEach((rw, i) => {
      const hit = [...w].filter((x) => rw.has(x)).length / Math.max(1, Math.min(w.size, 6));
      if (hit > score) { score = hit; best = i; }
    });
    const ref = score >= 0.34 ? p.steps[best] : undefined;
    return { text, refStep: ref ? best : undefined, clue: ref?.clue, template: ref?.template, code: ref?.code,
      note: ref ? `Lines up with: "${ref.text}"` : 'This one is your own idea. That is fine if the tests pass.' };
  });
  const covered = new Set(steps.map((s) => s.refStep).filter((x) => x !== undefined));
  const missing = p.steps.map((s, i) => ({ s, i })).filter(({ i }) => !covered.has(i));
  const slow = SLOW.filter((x) => x.re.test(lines.join(' ')) && !p.steps.some((s) => x.re.test(s.text + ' ' + s.code)));
  if (slow.length) return { verdict: 'works_but_slow', feedback: `${slow.map((x) => x.msg).join(' ')} The optimal solution avoids that. Think about which data structure answers your question in O(1).`, steps };
  if (!missing.length) return { verdict: 'looks_good', feedback: 'Every part of the optimal solution is in your plan. Now turn each line into code.', steps };
  return { verdict: 'missing', feedback: `Your plan doesn't clearly say how to: ${missing.map(({ s }) => `"${s.text.toLowerCase()}"`).join('; ')}. If your approach handles that differently, go ahead: the tests and speed check will tell you.`, steps };
}

function parseJSON<T>(t: string): T | null {
  try { return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) as T; } catch { return null; }
}

export async function reviewWithAI(p: Blueprint, lines: string[], sample: SampleFn): Promise<PlanReview | null> {
  const prompt = `You are a coding interview coach. A student wrote their own plan, in plain English, before coding. Judge the PLAN: is it correct, and is it the optimal time complexity? Any correct optimal approach is fine, even if it differs from the reference.

Problem: ${p.title}. ${p.statement}
Example: ${p.example}
Function: ${p.signature}
Reference optimal solution (for your judgment only, do not require the same steps or names):
${p.solution}

Student's plan:
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Reply with only JSON:
{"verdict":"optimal"|"works_but_slow"|"wrong"|"incomplete","complexity":"time complexity of their plan","optimal":"best possible time complexity","feedback":"2 or 3 plain sentences: what is good, what is wrong or missing, and how to think about fixing it. Don't give the code.","steps":[{"text":"their step, cleaned up a little, same meaning","ok":true,"note":"short: fine, or what to fix in this step","clue":"one short Python syntax hint for coding this step","template":"Python lines for this step with ____ blanks for the key parts, indented as they would be inside the function body but without the function's own 4 spaces"}]}
Keep one entry per student step, in order. If a needed step is missing, add it at the right place with ok false and note "missing step".`;
  try {
    const r = await sample(prompt, { cache: false });
    const j = parseJSON<PlanReview>(r.text);
    if (!j || !Array.isArray(j.steps) || !VERDICT[j.verdict]) return null;
    return { ...j, byAI: true };
  } catch { return null; }
}

/** After a failed run: which of your steps is off, and why. */
export async function coachRun(p: Blueprint, steps: PlanStep[], code: string, failure: string, sample: SampleFn): Promise<{ summary: string; steps: { n: number; ok: boolean; note: string }[] } | null> {
  const prompt = `You are a patient Python coach. The student planned their solution in their own words and is coding it step by step. Find which step is wrong and explain how to think about the fix. Don't rewrite their whole solution. You may show at most one corrected line.

Problem: ${p.title}. ${p.statement}
Their plan:
${steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n')}

Their code (each step starts with a "# Step N" comment):
${code}

What happened when running the tests:
${failure}

Reply with only JSON: {"summary":"1 or 2 sentences","steps":[{"n":1,"ok":true,"note":"short note"}]}`;
  try {
    const r = await sample(prompt, { cache: false });
    return parseJSON(r.text);
  } catch { return null; }
}

/** Write your logic first, in your own words. It gets reviewed for correctness and optimality before you code. */
export function PlanWriter({ p, sample, onReady, onCancel }: { p: Blueprint; sample: SampleFn | null | undefined; onReady: (steps: PlanStep[], review: PlanReview) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<PlanReview | null>(null);
  const speech = useSpeech((t) => setText((x) => (x ? `${x}\n${t}` : t)));
  const lines = text.split('\n').map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim()).filter(Boolean);
  const ai = aiName();

  const check = async () => {
    speech.stop();
    setBusy(true);
    const r = (sample ? await reviewWithAI(p, lines, sample) : null) ?? reviewOffline(p, lines);
    setReview(r);
    setBusy(false);
  };
  const v = review ? VERDICT[review.verdict] : null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-zinc-100">Your plan, in your own words</h3>
      <p className="mt-1 text-sm text-zinc-400">One step per line, the way you'd explain it to an interviewer before coding. Any correct approach counts. {sample ? `${ai} checks that it's correct and optimal.` : 'It gets checked against the optimal solution. Add a free Gemini key under Stats for full AI review.'}</p>
      <textarea value={text + (speech.interim ? `\n${speech.interim}` : '')} onChange={(e) => { setText(e.target.value); setReview(null); }} rows={6}
        placeholder={'e.g.\nmake a set for numbers I have seen\ngo through each number\nif it is already in the set return True\nelse add it, return False at the end'}
        className="mt-3 w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-[13.5px] leading-relaxed text-zinc-100 outline-none focus:border-violet-500" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button onClick={check} disabled={busy || lines.length < 1}>{busy ? 'Checking…' : 'Check my plan'}</Button>
        <Button variant={speech.on ? 'primary' : 'ghost'} onClick={() => (speech.on ? speech.stop() : speech.start())}>{speech.on ? <><MicOff size={15} />Stop</> : <><Mic size={15} />Say it</>}</Button>
        <span className="flex-1" />
        <button onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-200">Use the blueprint's steps instead</button>
      </div>
      {speech.err && <p className="mt-2 text-sm text-amber-300">{speech.err}</p>}
      {review && v && (
        <div className={`mt-4 rounded-md border px-3 py-3 ${v[1].split(' ')[1]}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className={`font-semibold ${v[1].split(' ')[0]}`}>{v[0]}</span>
            <span className="text-xs text-zinc-500">{review.byAI ? `Reviewed by ${ai}` : 'Checked against the optimal solution'}{review.complexity ? ` · yours ${review.complexity}` : ''}{review.optimal ? ` · best ${review.optimal}` : ''}</span>
          </div>
          <p className="mt-1 text-sm text-zinc-200">{review.feedback}</p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {review.steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className={`w-5 shrink-0 text-right tnum ${s.ok === false ? 'text-rose-300' : 'text-zinc-500'}`}>{i + 1}.</span>
                <span><span className="text-zinc-100">{s.text}</span>{s.note && <span className={`block text-xs ${s.ok === false ? 'text-rose-300' : 'text-zinc-500'}`}>{s.note}</span>}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => onReady(review.steps.filter((s) => s.text.trim()), review)}>{review.verdict === 'wrong' ? 'Code it anyway' : 'Start coding with my plan'}</Button>
            <Button variant="ghost" onClick={() => setReview(null)}>Edit the plan</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/** One of your own steps, with hints. */
export function OwnStepCard({ i, s, note, onInsert, sample, onAsk }: { i: number; s: PlanStep; note?: { ok: boolean; note: string }; onInsert: (tmpl: string) => void; sample: SampleFn | null | undefined; onAsk: () => Promise<string> }) {
  const [lvl, setLvl] = useState(0);
  const [ai, setAi] = useState('');
  const [busy, setBusy] = useState(false);
  const has = { clue: !!s.clue, tmpl: !!s.template, code: !!s.code };
  const maxLvl = has.code ? 3 : has.tmpl ? 2 : has.clue ? 1 : 0;
  const next = () => { const n = lvl + 1; setLvl(n); if (n === 2 && s.template) onInsert(s.template); };
  return (
    <li>
      <Card className={`p-4 ${note && !note.ok ? 'border-rose-500/40' : ''}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${note ? (note.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300') : 'bg-zinc-800 text-zinc-300'}`}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-zinc-100">{s.text}</p>
            {note && <p className={`mt-1 text-sm ${note.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{note.note}</p>}
            {lvl >= 1 && s.clue && <p className="mt-2 text-sm text-zinc-300"><span className="font-medium text-amber-300">Clue: </span>{s.clue}</p>}
            {lvl >= 2 && s.template && <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-950 px-3 py-2 font-mono text-[12.5px] text-zinc-300">{s.template}</pre>}
            {lvl >= 3 && s.code && <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-950 px-3 py-2 font-mono text-[12.5px] text-zinc-100">{s.code}</pre>}
            {ai && <p className="mt-2 whitespace-pre-wrap rounded-md border border-violet-500/30 px-3 py-2 text-sm text-zinc-200">{ai}</p>}
            <div className="mt-2 flex flex-wrap gap-3">
              {lvl < maxLvl && <button onClick={next} className="flex items-center gap-1 text-sm text-violet-300 hover:underline"><Lightbulb size={14} />{lvl === 0 ? 'Hint: syntax clue' : lvl === 1 ? 'Hint: fill in the blank' : 'Hint: show the lines'}</button>}
              {sample && <button disabled={busy} onClick={async () => { setBusy(true); setAi(await onAsk()); setBusy(false); }} className="flex items-center gap-1 text-sm text-violet-300 hover:underline"><Sparkles size={14} />{busy ? 'Asking…' : `Ask ${aiName() ?? 'AI'} about this step`}</button>}
            </div>
          </div>
        </div>
      </Card>
    </li>
  );
}

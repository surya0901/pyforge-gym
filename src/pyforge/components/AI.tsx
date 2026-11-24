import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { COMPANY_NAME } from '../data/meta';
import { NC_SECTIONS, NEETCODE } from '../data/neetcode';
import { areaStats } from '../lib/coach';
import { DAILY_ASKS, DAILY_GRADES, getSample, type SampleFn } from '../lib/cloud';
import type { CompanyId, Progress } from '../types';
import { Button, Card } from './ui';

export function useSample() {
  const [sample, setSample] = useState<SampleFn | null | undefined>(undefined);
  // Wrap in a thunk: setState(fn) would treat the function as an updater and CALL it.
  useEffect(() => { getSample().then((fn) => setSample(() => fn)); }, []);
  return sample; // undefined = still checking, null = not available here
}

/** Renders plain text with blank-line paragraphs and "- " bullets, no markdown library. */
function Prose({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-3 leading-relaxed text-zinc-200">
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => /^\s*[-•*]\s/.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, k) => <li key={k}>{l.replace(/^\s*[-•*]\s/, '').replace(/\*\*/g, '')}</li>)}</ul>;
        }
        const isHead = lines.length === 1 && b.length < 60 && !/[.!?]$/.test(b.trim());
        return isHead
          ? <h4 key={i} className="pt-1 font-semibold text-zinc-100">{b.replace(/^#+\s*/, '').replace(/\*\*/g, '')}</h4>
          : <p key={i} className="whitespace-pre-line">{b.replace(/\*\*/g, '')}</p>;
      })}
    </div>
  );
}

function useStream() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ctrl = useRef<AbortController | null>(null);
  const run = async (sample: SampleFn, prompt: string) => {
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setBusy(true); setErr(''); setText('');
    try {
      const r = await sample(prompt, { onText: ({ text: t }: { text: string }) => setText(t), signal: ctrl.current.signal, cache: false });
      setText(r.text);
    } catch (e) {
      const code = (e as { code?: string }).code;
      setErr(code === 'rate_limited' ? 'Claude is busy right now. Try again in a minute.' : code === 'not_granted' ? 'Allow Claude access for this page to use the coach.' : 'Could not reach Claude. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return { text, busy, err, run };
}

export function CoachPanel({ progress, solved, targets }: { progress: Progress; solved: Set<string>; targets: CompanyId[] }) {
  const sample = useSample();
  const { text, busy, err, run } = useStream();
  if (sample === null) return null;

  const ask = () => {
    if (!sample) return;
    const stats = areaStats(progress).map((s) => `- ${s.name}: ${s.attempts} attempts, ${Math.round(s.accuracy * 100)}% accurate, mastery ${Math.round(s.mastery * 100)}%`).join('\n');
    const nc = NC_SECTIONS.map((sec) => {
      const all = NEETCODE.filter((p) => p.section === sec);
      return `- ${sec}: ${all.filter((p) => solved.has(p.slug)).length}/${all.length}`;
    }).join('\n');
    const slips = Object.entries(progress.mistakes).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ×${v}`).join(', ') || 'none yet';
    const companies = targets.length ? targets.map((t) => COMPANY_NAME[t]).join(', ') : 'Citadel, HRT, Jane Street, Meta, Microsoft, Amazon, Google, Netflix, Apple, Nvidia, OpenAI';
    run(sample, `You are a direct, encouraging interview coach for a new grad software engineer (Computer Engineering M.S., Python). Targets: ${companies}.

Practice app stats:
${stats}

NeetCode 150 progress by section (${solved.size}/150 total):
${nc}

Most frequent mistakes: ${slips}

Write, in plain text with short headings and "- " bullets, no markdown symbols:
Where you stand: 2 honest sentences.
Strengths: up to 3 bullets (say "not enough data yet" if attempts are low).
Biggest gaps for these companies: 3 bullets, most important first.
Today (about 45 minutes): 3 concrete steps naming specific NeetCode problems or app modes.
This week: 4 bullets.
Keep it under 250 words.`);
  };

  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-100"><Sparkles size={17} className="text-amber-400" />Ask your Claude coach</h3>
      <p className="mt-1 text-sm text-zinc-400">Claude reads your drill stats, NeetCode progress and recurring mistakes, then tells you where you are lacking and what to do today.</p>
      <Button className="mt-3" onClick={ask} disabled={!sample || busy}>{busy ? 'Thinking…' : text ? 'Ask again' : 'Analyze my progress'}</Button>
      {err && <p className="mt-3 text-sm text-rose-300">{err}</p>}
      {text && <div className="mt-4 border-t border-zinc-800 pt-4"><Prose text={text} /></div>}
    </Card>
  );
}

export function BehavioralPractice({ question, company }: { question: string; company?: CompanyId }) {
  const sample = useSample();
  const [answer, setAnswer] = useState('');
  const { text, busy, err, run } = useStream();
  if (sample === null) return <LocalGrade question={question} answer={answer} setAnswer={setAnswer} />;

  const grade = () => {
    if (!sample || answer.trim().length < 40) return;
    const who = company ? COMPANY_NAME[company] : 'a top tech company';
    run(sample, `You are a strict but kind behavioral interviewer at ${who} hiring a new grad software engineer.
Question: "${question}"
Candidate's answer (spoken style, may be rough):
"""${answer.slice(0, 4000)}"""

Grade it. Plain text, short headings, "- " bullets, no markdown symbols:
Score: X/10, one sentence why.
STAR check: say which of Situation, Task, Action, Result are clear or missing.
What ${who} interviewers would like: 2 bullets tied to the company's known values.
Fix these: 3 specific bullets (use "I" not "we", add a number to the result, cut filler...).
Tighter version: rewrite the answer in about 120 words using ONLY facts the candidate gave; mark any missing detail as [add: ...] instead of inventing it.`);
  };

  return (
    <div className="space-y-3">
      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5}
        placeholder="Type your answer the way you would say it out loud…"
        className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500" />
      <div className="flex items-center gap-3">
        <Button onClick={grade} disabled={!sample || busy || answer.trim().length < 40}>{busy ? 'Grading…' : 'Get feedback from Claude'}</Button>
        {answer.trim().length < 40 && <span className="text-sm text-zinc-500">Write at least a few sentences first.</span>}
      </div>
      {err && <p className="text-sm text-rose-300">{err}</p>}
      {text && <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4"><Prose text={text} /></div>}
    </div>
  );
}

/** Offline answer check for the standalone site: a STAR checklist with concrete fixes. */
export function starCheck(answer: string) {
  const t = answer.trim();
  const words = t.split(/\s+/).filter(Boolean);
  const lower = ` ${t.toLowerCase()} `;
  const count = (re: RegExp) => (lower.match(re) ?? []).length;
  const iCount = count(/\b(i|i'm|i've|i'd|my|me)\b/g);
  const weCount = count(/\b(we|we're|we've|our|us)\b/g);
  const firstThird = lower.slice(0, Math.max(60, Math.floor(lower.length / 3)));
  const situation = /\b(when|during|while|at|in my|last (year|summer|semester)|internship|project|class|team|club|hackathon)\b/.test(firstThird);
  const task = /\b(needed to|had to|goal|task|responsible|asked to|my job|deadline|problem was|challenge)\b/.test(lower);
  const action = iCount >= 3 && /\b(i (built|wrote|designed|led|decided|reached|created|fixed|proposed|set up|talked|organized|automated|debugged|implemented|took|started|made|split|tested))\b/.test(lower);
  const hasNumber = /\d/.test(t) || /\b(percent|twice|double|half|hours|days|weeks|users|students|members)\b/.test(lower);
  const result = /\b(result|as a result|led to|so that|reduced|increased|improved|saved|cut|grew|shipped|launched|won|finished|delivered|went from)\b/.test(lower);
  const learned = /\b(learned|learnt|next time|now i|since then|taught me|would do differently)\b/.test(lower);
  const filler = count(/\b(like|basically|kind of|sort of|um|uh|you know|stuff|things)\b/g);
  const parts = [
    { name: 'Situation', ok: situation, fix: 'Open with one sentence of context: where you were and when.' },
    { name: 'Task', ok: task, fix: 'Say what you specifically had to achieve or what was at stake.' },
    { name: 'Action', ok: action, fix: 'Spend most of the answer on what YOU did, with "I" verbs: I built, I decided, I talked to.' },
    { name: 'Result', ok: result && hasNumber, fix: result ? 'Put a number on the result (time saved, %, users, members).' : 'End with the outcome, ideally with a number.' },
  ];
  const fixes: string[] = parts.filter((x) => !x.ok).map((x) => x.fix);
  if (weCount > iCount) fixes.push(`You said "we" ${weCount} times and "I" ${iCount} times. Interviewers hire you, not the team, so switch to "I" for your part.`);
  if (words.length < 120) fixes.push(`At ${words.length} words this is short. A full answer is about 150 to 250 words, roughly 1 to 2 minutes out loud.`);
  if (words.length > 350) fixes.push(`At ${words.length} words this runs long. Cut the setup and keep the action and result.`);
  if (!learned) fixes.push('Close with what you learned or would do differently. It shows self-awareness.');
  if (filler > 2) fixes.push(`Drop filler words (${filler} found, like "basically" or "kind of").`);
  let score = parts.filter((x) => x.ok).length * 2;
  if (weCount <= iCount) score += 1;
  if (words.length >= 120 && words.length <= 350) score += 1;
  if (learned) score += 0.5;
  if (filler <= 2) score += 0.5;
  return { score: Math.min(10, Math.round(score)), parts, fixes, words: words.length };
}

function LocalGrade({ question, answer, setAnswer }: { question: string; answer: string; setAnswer: (s: string) => void }) {
  const [res, setRes] = useState<ReturnType<typeof starCheck> | null>(null);
  return (
    <div className="space-y-3">
      <textarea value={answer} onChange={(e) => { setAnswer(e.target.value); setRes(null); }} rows={6} aria-label={question}
        placeholder="Type your answer the way you would say it out loud…"
        className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500" />
      <div className="flex items-center gap-3">
        <Button onClick={() => setRes(starCheck(answer))} disabled={answer.trim().length < 40}>Check my answer</Button>
        {answer.trim().length < 40 && <span className="text-sm text-zinc-500">Write at least a few sentences first.</span>}
      </div>
      {res && (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-[15px] leading-relaxed">
          <p className="font-semibold text-zinc-100">Score {res.score}/10 <span className="font-normal text-zinc-500">· {res.words} words</span></p>
          <div className="mt-2 flex flex-wrap gap-2">
            {res.parts.map((x) => <span key={x.name} className={`rounded px-2 py-0.5 text-sm ${x.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{x.ok ? '✓' : '✗'} {x.name}</span>)}
          </div>
          {res.fixes.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-zinc-300 marker:text-zinc-600">{res.fixes.map((f) => <li key={f}>{f}</li>)}</ul>
            : <p className="mt-3 text-zinc-300">Solid structure. Now say it out loud twice and time it.</p>}
          <p className="mt-3 text-xs text-zinc-500">This checks structure, not content. For a full critique, paste your answer into Claude with the question.</p>
        </div>
      )}
    </div>
  );
}

/** AI is server side on DeepSpace: no key in the browser. Shows today's limits instead. */
export function ClaudeKeyCard() {
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-semibold text-zinc-100"><Sparkles size={16} className="text-amber-400" />AI feedback is built in</h3>
      <p className="mt-1 text-sm text-zinc-400">Claude reviews your plans, grades flashcards by meaning and scores system design answers. It runs on the server through DeepSpace, so there is no API key to paste and nothing secret is stored in this browser.</p>
      <p className="mt-2 text-xs text-zinc-500">Fair use: {DAILY_GRADES} design gradings and {DAILY_ASKS} coach replies per day.</p>
    </Card>
  );
}

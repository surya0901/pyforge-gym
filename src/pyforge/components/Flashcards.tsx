import { Mic, MicOff, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { resourcesForCard, videoSearch } from '../data/cardResources';
import { gradeCard, keyIdeas, type Grade, type Verdict } from '../lib/cardGrade';
import { logMistake } from '../lib/mistakes';
import { aiName } from '../lib/cloud';
import { useSample } from './AI';
import { useSpeech } from '../lib/speech';
import { COMPANY_NAME } from '../data/meta';
import { DECKS, FLASHCARDS, type DeckId, type Flashcard } from '../data/flashcards';
import { getLocal, mastery, setLocal } from '../lib/storage';
import { shuffle } from '../lib/check';
import type { CompanyId, Progress } from '../types';
import { Bar, Button, Card, Kbd, PageTitle } from './ui';

interface Props {
  progress: Progress;
  company: CompanyId | 'all';
  initialDeck?: string;
  onResult: (id: string, quality: 0 | 1 | 2 | 3, tags: string[]) => void;
}


export default function Flashcards({ progress, company, initialDeck, onResult }: Props) {
  const [tab, setTab] = useState<'cards' | 'stories'>('cards');
  const [deck, setDeck] = useState<DeckId | 'due' | 'all' | null>((initialDeck as DeckId) ?? null);

  return (
    <div>
      <PageTitle sub="Type or say your answer in your own words. It gets checked, you see exactly which ideas you missed, and where to learn them. Cards you miss come back sooner.">Flashcards</PageTitle>
      <div className="mb-6 flex gap-1 border-b border-zinc-800">
        {(['cards', 'stories'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 font-medium transition-colors ${tab === t ? 'border-violet-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
            {t === 'cards' ? 'Decks' : 'My story bank'}
          </button>
        ))}
      </div>
      {tab === 'stories' ? <StoryBank /> : deck ? (
        <Session key={`${deck}-${company}`} deck={deck} company={company} progress={progress} onResult={onResult} onExit={() => setDeck(null)} />
      ) : (
        <DeckPicker progress={progress} company={company} onPick={setDeck} />
      )}
    </div>
  );
}

function cardsFor(deck: DeckId | 'due' | 'all', company: CompanyId | 'all', p: Progress): Flashcard[] {
  const now = Date.now();
  let list = FLASHCARDS.filter((c) => company === 'all' || !c.companies || c.companies.includes(company));
  if (deck === 'due') list = list.filter((c) => p.cards[c.id] && p.cards[c.id].due <= now);
  else if (deck !== 'all') list = list.filter((c) => c.deck === deck);
  const due = list.filter((c) => p.cards[c.id] && p.cards[c.id].due <= now);
  const fresh = shuffle(list.filter((c) => !p.cards[c.id]));
  const later = list.filter((c) => p.cards[c.id] && p.cards[c.id].due > now).sort((a, b) => mastery(p.cards[a.id]) - mastery(p.cards[b.id]));
  return [...due, ...fresh, ...later];
}

function DeckPicker({ progress, company, onPick }: { progress: Progress; company: CompanyId | 'all'; onPick: (d: DeckId | 'due' | 'all') => void }) {
  const now = Date.now();
  const due = FLASHCARDS.filter((c) => progress.cards[c.id] && progress.cards[c.id].due <= now).length;
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={() => onPick('due')} disabled={!due}>Review {due} due {due === 1 ? 'card' : 'cards'}</Button>
        <Button variant="subtle" onClick={() => onPick('all')}>Shuffle everything</Button>
        {company !== 'all' && <span className="self-center text-sm text-zinc-500">Showing cards relevant to {COMPANY_NAME[company]}</span>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DECKS.map((d) => {
          const cards = FLASHCARDS.filter((c) => c.deck === d.id && (company === 'all' || !c.companies || c.companies.includes(company)));
          const m = cards.reduce((s, c) => s + mastery(progress.cards[c.id]), 0) / Math.max(1, cards.length);
          const dueHere = cards.filter((c) => progress.cards[c.id] && progress.cards[c.id].due <= now).length;
          return (
            <button key={d.id} onClick={() => onPick(d.id)} disabled={!cards.length}
              className="index-card group relative rounded-sm px-5 pb-4 pl-[68px] pt-4 text-left transition-transform hover:-translate-y-0.5 disabled:opacity-40">
              <div className="text-xl font-semibold text-zinc-100">{d.name}</div>
              <p className="mt-1 min-h-[3em] text-sm leading-[2] text-zinc-400">{d.blurb}</p>
              <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                <span className="tnum">{cards.length} cards{dueHere ? `, ${dueHere} due` : ''}</span>
                <span className="tnum">{Math.round(m * 100)}%</span>
              </div>
              <div className="mt-1.5"><Bar value={m} /></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Phase = 'answer' | 'checking' | 'result';

const VERDICT: Record<Verdict, { label: string; cls: string; q: 0 | 1 | 2 }> = {
  right: { label: 'Right', cls: 'border-emerald-500/40 text-emerald-300', q: 2 },
  partly: { label: 'Partly right', cls: 'border-amber-500/40 text-amber-300', q: 1 },
  missed: { label: 'Not yet', cls: 'border-rose-500/40 text-rose-300', q: 0 },
};

function Session({ deck, company, progress, onResult, onExit }: { deck: DeckId | 'due' | 'all'; company: CompanyId | 'all'; progress: Progress; onResult: Props['onResult']; onExit: () => void }) {
  const queue = useMemo(() => cardsFor(deck, company, progress), [deck, company]);  
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>('answer');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [tally, setTally] = useState({ right: 0, partly: 0, missed: 0 });
  const [missedCards, setMissedCards] = useState<Flashcard[]>([]);
  const sample = useSample();
  const speech = useSpeech((t) => setAnswer((a) => (a ? `${a} ${t}` : t)));
  const ta = useRef<HTMLTextAreaElement>(null);
  const card = queue[i];
  useEffect(() => { ta.current?.focus(); }, [i]);

  const check = async (skip = false) => {
    if (!card || phase !== 'answer') return;
    speech.stop();
    setPhase('checking');
    const g = skip ? { verdict: 'missed' as Verdict, score: 0, covered: [], missed: keyIdeas(card.back), feedback: 'No answer this time. Read the answer, then say it back in your own words before moving on.' } : await gradeCard(card, answer, sample);
    setGrade(g);
    setVerdict(g.verdict);
    setPhase('result');
  };

  const next = () => {
    if (!card || !verdict) return;
    onResult(card.id, VERDICT[verdict].q, verdict === 'missed' ? [`card-miss-${card.deck}`] : []);
    if (verdict !== 'right') logMistake({ source: 'flashcards', kind: `card-${card.deck}`, label: card.front, ref: card.id });
    setTally((t) => ({ ...t, [verdict]: t[verdict] + 1 }));
    if (verdict !== 'right') setMissedCards((m) => [...m, card]);
    setI((x) => x + 1);
    setAnswer(''); setGrade(null); setVerdict(null); setPhase('answer');
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && phase === 'answer') { e.preventDefault(); check(); return; }
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'Enter' && phase === 'result') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  if (!card) {
    const total = tally.right + tally.partly + tally.missed;
    return (
      <Card className="mx-auto max-w-2xl p-8">
        <p className="text-xl font-semibold text-zinc-100">{total ? <span className="hl">Stack finished.</span> : 'Nothing here yet.'}</p>
        {total ? (
          <>
            <p className="mt-2 text-zinc-400">{tally.right} right, {tally.partly} partly, {tally.missed} not yet. Cards you missed come back sooner.</p>
            {missedCards.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-semibold text-zinc-100">Study these before next time</h3>
                <ul className="space-y-2">
                  {missedCards.map((c) => (
                    <li key={c.id} className="rounded-md border border-zinc-800 p-3 text-sm">
                      <div className="text-zinc-200">{c.front}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {resourcesForCard(c).slice(0, 2).map((r) => <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="link text-xs">{r.label}</a>)}
                        <a href={videoSearch(c)} target="_blank" rel="noreferrer" className="link text-xs">Videos on this</a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : <p className="mt-2 text-zinc-400">No cards are due right now. Pick a deck to learn new ones.</p>}
        <Button className="mt-5" variant="subtle" onClick={onExit}>Back to decks</Button>
      </Card>
    );
  }

  const deckName = DECKS.find((d) => d.id === card.deck)?.name;
  const v = verdict ? VERDICT[verdict] : null;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center justify-between text-sm text-zinc-500">
        <button onClick={onExit} className="hover:text-zinc-200">All decks</button>
        <span className="tnum">{i + 1} of {queue.length} · {tally.right} right so far</span>
      </div>
      <div className="index-card rounded-sm px-8 py-6 pl-[76px]">
        <div className="text-sm text-violet-300">{deckName}{card.companies ? <span className="text-zinc-500"> · comes up at {card.companies.map((c) => COMPANY_NAME[c]).join(', ')}</span> : null}</div>
        <p className="mt-3 text-[24px] font-semibold leading-[1.3] text-zinc-100">{card.front}</p>
      </div>

      {phase !== 'result' ? (
        <div className="mt-4">
          <textarea ref={ta} value={answer + (speech.interim ? (answer ? ' ' : '') + speech.interim : '')} onChange={(e) => setAnswer(e.target.value)} rows={5} disabled={phase === 'checking'}
            placeholder="Type your answer the way you'd say it to an interviewer, or press Speak. Your own words are fine."
            className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-[15px] leading-relaxed text-zinc-100 outline-none focus:border-violet-500" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button onClick={() => check()} disabled={phase === 'checking' || !answer.trim()}>{phase === 'checking' ? 'Checking…' : 'Check my answer'}<Kbd>⌘ Enter</Kbd></Button>
            <Button variant={speech.on ? 'primary' : 'ghost'} onClick={() => (speech.on ? speech.stop() : speech.start())} disabled={phase === 'checking'}>
              {speech.on ? <><MicOff size={15} />Stop</> : <><Mic size={15} />Speak</>}
            </Button>
            {speech.on && <span className="flex items-center gap-1.5 text-sm text-rose-300"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />Listening…</span>}
            <span className="flex-1" />
            <button onClick={() => check(true)} className="text-sm text-zinc-500 hover:text-zinc-200">I don't know, show me</button>
          </div>
          {speech.err && <p className="mt-2 text-sm text-amber-300">{speech.err}</p>}
          <p className="mt-2 text-xs text-zinc-500">{sample ? `${aiName() ?? 'AI'} grades your answer by meaning.` : 'Graded on this device by the key ideas you cover, not exact words. Add a free Gemini key under Stats to have AI grade by meaning instead.'}</p>
        </div>
      ) : grade && v && (
        <div className="mt-4 space-y-3">
          <Card className={`border p-4 ${v.cls.split(' ')[0]}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className={`text-lg font-semibold ${v.cls.split(' ')[1]}`}>{v.label}</span>
              <span className="text-xs text-zinc-500">{grade.byAI ? `Graded by ${aiName() ?? 'AI'}` : 'Auto-check by key ideas'}</span>
            </div>
            <p className="mt-1 text-[15px] text-zinc-200">{grade.feedback}</p>
            {answer && <p className="mt-2 border-l-2 border-zinc-700 pl-3 text-sm text-zinc-400">You said: {answer}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="text-zinc-500">Wrong call?</span>
              {(['right', 'partly', 'missed'] as Verdict[]).filter((x) => x !== verdict).map((x) => (
                <button key={x} onClick={() => setVerdict(x)} className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-300 hover:border-zinc-500">Count it as {VERDICT[x].label.toLowerCase()}</button>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h4 className="mb-2 text-sm font-semibold text-zinc-100">The answer, idea by idea</h4>
            <ul className="space-y-1.5 text-[15px]">
              {keyIdeas(card.back).map((idea, k) => {
                const got = grade.covered.includes(idea);
                return (
                  <li key={k} className="flex gap-2">
                    <span className={`mt-0.5 w-4 shrink-0 ${got ? 'text-emerald-400' : 'text-zinc-500'}`}>{got ? '✓' : '○'}</span>
                    <span className={got ? 'text-zinc-400' : 'text-zinc-100'}>{idea}</span>
                  </li>
                );
              })}
            </ul>
            {grade.byAI && grade.missed.length > 0 && <p className="mt-2 text-sm text-amber-200">Left out: {grade.missed.join('; ')}</p>}
          </Card>
          {verdict !== 'right' && (
            <Card className="p-4">
              <h4 className="mb-2 text-sm font-semibold text-zinc-100">Get this one solid</h4>
              <p className="mb-2 text-sm text-zinc-400">Say the full answer out loud once now, in your own words. This card comes back sooner. To go deeper:</p>
              <ul className="space-y-1.5 text-sm">
                {resourcesForCard(card).map((r) => (
                  <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer" className="link">{r.label}</a> <span className="text-zinc-500">· {r.why}</span></li>
                ))}
                <li><a href={videoSearch(card)} target="_blank" rel="noreferrer" className="link">YouTube explanations of this question</a></li>
              </ul>
            </Card>
          )}
          <Button onClick={next}>Next card <Kbd>Enter</Kbd></Button>
        </div>
      )}
    </div>
  );
}

// ───────────── Story bank ─────────────

const THEMES = ['Conflict', 'Failure', 'Leadership', 'Ambiguity', 'Tight deadline', 'Customer impact', 'Feedback', 'Proudest project', 'Being wrong', 'Learning fast'] as const;
interface Story { id: string; title: string; situation: string; action: string; result: string; themes: string[] }
const KEY = 'pyforge.stories.v1';

function StoryBank() {
  const [stories, setStories] = useState<Story[]>(() => getLocal<Story[]>(KEY, []));
  const [open, setOpen] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => setLocal(KEY, stories), [stories]);

  const add = () => {
    const s: Story = { id: crypto.randomUUID?.() ?? String(Date.now()), title: 'New story', situation: '', action: '', result: '', themes: [] };
    setStories((x) => [s, ...x]);
    setOpen(s.id);
  };
  const upd = (id: string, patch: Partial<Story>) => setStories((x) => x.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const covered = new Set(stories.flatMap((s) => s.themes));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="max-w-[60ch] text-zinc-400">Write 6–8 real stories once. Tag each with the themes it can answer, and one story covers several questions.</p>
          <Button onClick={add}><Plus size={16} />Add story</Button>
        </div>
        {stories.length === 0 && (
          <Card className="p-6 text-zinc-400">Start with your proudest project, a disagreement you resolved, and a time something failed. Situation in two sentences, what you did, and a result with a number.</Card>
        )}
        {stories.map((s) => (
          <Card key={s.id} className="overflow-hidden">
            <button onClick={() => setOpen(open === s.id ? null : s.id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
              <span className="font-semibold text-zinc-100">{s.title || 'Untitled story'}</span>
              <span className="text-sm text-zinc-500">{s.themes.join(', ') || 'No themes yet'}</span>
            </button>
            {open === s.id && (
              <div className="space-y-3 border-t border-zinc-800 px-4 py-4">
                <input value={s.title} onChange={(e) => upd(s.id, { title: e.target.value })} placeholder="Short title"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-semibold text-zinc-100 outline-none focus:border-violet-500" />
                {(['situation', 'action', 'result'] as const).map((f) => (
                  <label key={f} className="block">
                    <span className="mb-1 block text-sm font-medium text-zinc-300">{f === 'situation' ? 'Situation and task' : f === 'action' ? 'What I did (use "I")' : 'Result, with a number, and what I learned'}</span>
                    <textarea value={s[f]} onChange={(e) => upd(s.id, { [f]: e.target.value })} rows={3}
                      className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-violet-500" />
                  </label>
                ))}
                <div className="flex flex-wrap gap-1.5">
                  {THEMES.map((t) => {
                    const on = s.themes.includes(t);
                    return (
                      <button key={t} onClick={() => upd(s.id, { themes: on ? s.themes.filter((x) => x !== t) : [...s.themes, t] })}
                        className={`rounded-full border px-2.5 py-0.5 text-sm transition-colors ${on ? 'border-amber-600 bg-amber-500/40 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>{t}</button>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <Button variant="ghost" onClick={() => { if (armed === s.id) setStories((x) => x.filter((y) => y.id !== s.id)); else { setArmed(s.id); setTimeout(() => setArmed(null), 3000); } }}><Trash2 size={15} />{armed === s.id ? 'Click again to delete' : 'Delete'}</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      <Card className="h-fit p-4">
        <h3 className="mb-1 font-semibold text-zinc-100">Theme coverage</h3>
        <p className="mb-3 text-sm text-zinc-500">{covered.size} of {THEMES.length} covered</p>
        <ul className="space-y-1.5">
          {THEMES.map((t) => (
            <li key={t} className={`text-sm ${covered.has(t) ? 'text-zinc-100' : 'text-zinc-500'}`}>
              {covered.has(t) ? <span className="hl">{t}</span> : t}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">Stories stay in this browser only.</p>
      </Card>
    </div>
  );
}

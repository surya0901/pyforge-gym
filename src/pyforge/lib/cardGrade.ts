/**
 * Grades a typed or spoken flashcard answer against the card's answer by meaning, not wording.
 * Works offline: it pulls the key ideas out of the official answer (one per sentence or list
 * item), and checks which ideas your answer covers, matching word stems and common synonyms.
 * When Claude is available (the claude.ai copy of pyforge) it grades with Claude instead.
 */
import type { Flashcard } from '../data/flashcards';
import type { SampleFn } from './cloud';

export type Verdict = 'right' | 'partly' | 'missed';
export interface Grade { verdict: Verdict; score: number; covered: string[]; missed: string[]; feedback: string; byAI?: boolean }

const STOP = new Set(`a an the and or but if then than that this those these there their they them it its is are was were be been being to of in on at by for from with as into onto over under about after before when while where which who whom whose what why how not no do does did done can could should would will may might must you your yours we our us i me my he she his her so such very more most less least also just only even each every any all some one two three per via up down out off again once here use used using make makes made get gets got say says said like etc e g ie eg vs versus because why whats what's thing things way ways time times good well really`.split(/\s+/));

const SYN: Record<string, string[]> = {
  fast: ['quick', 'speed', 'faster', 'quickly', 'low latency'], slow: ['slower', 'latency'],
  lock: ['mutex', 'locking', 'locks'], mutex: ['lock'], memory: ['ram', 'heap'], cache: ['caching', 'cached'],
  thread: ['threads', 'threading'], process: ['processes'], copy: ['copies', 'copying', 'duplicate'],
  big: ['large', 'huge'], small: ['tiny', 'little'], error: ['bug', 'mistake', 'exception'], fail: ['failure', 'crash', 'down'],
  number: ['metric', 'numbers', 'quantify', 'measurable', 'percent'], result: ['outcome', 'impact'],
  user: ['customer', 'client'], customer: ['user', 'client'], team: ['teammate', 'colleague', 'coworker'],
  learn: ['learned', 'lesson', 'growth'], own: ['ownership', 'responsibility', 'accountable'],
  hash: ['dictionary', 'dict', 'hashmap', 'map'], dict: ['hash', 'dictionary', 'map'], list: ['array'], array: ['list'],
  queue: ['fifo'], stack: ['lifo'], probability: ['chance', 'odds', 'likely'], expected: ['ev', 'average', 'mean'],
  average: ['mean', 'expected'], gpu: ['cuda', 'graphics'], parallel: ['concurrent', 'simultaneously'],
  database: ['db', 'sql'], request: ['requests', 'query', 'call'], server: ['servers', 'machine', 'node', 'host'],
  scale: ['scaling', 'scalable', 'horizontal'], replica: ['replication', 'replicas', 'copy'], shard: ['partition', 'sharding'],
};

/** A crude stem: lowercase, strip common English endings. */
export function stem(w: string) {
  let s = w.toLowerCase().replace(/[^a-z0-9+#]/g, '');
  for (const suf of ['ational', 'ization', 'ations', 'ation', 'ingly', 'ments', 'ment', 'ness', 'ings', 'ing', 'ies', 'ied', 'ers', 'er', 'est', 'ed', 'es', 'ly', 's']) {
    if (s.length > suf.length + 2 && s.endsWith(suf)) { s = s.slice(0, -suf.length); break; }
  }
  return s;
}

const words = (t: string) => (t.match(/[A-Za-z][A-Za-z0-9+#'-]*|\d+(?:\.\d+)?%?|O\([^)]*\)/g) ?? []).map((w) => w.replace(/'s$/, ''));

function terms(t: string) {
  return words(t).filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()) || /\d|O\(|\+\+|#/.test(w));
}

/** The answer's key ideas: sentences, or list items when a sentence is a list. */
export function keyIdeas(back: string): string[] {
  const parts = back.split(/(?<=[.!?])\s+|;\s+|:\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const items = splitTop(p);
    if (items.length >= 3 && items.every((x) => x.split(/\s+/).length <= 7)) out.push(...items.map((x) => x.replace(/^(and|or)\s+/i, '').replace(/[.]$/, '')));
    else out.push(p.replace(/[.]$/, ''));
  }
  return out.filter((x) => terms(x).length > 0);
}

function has(answerStems: Set<string>, answerText: string, term: string) {
  const s = stem(term);
  if (!s) return false;
  if (answerStems.has(s)) return true;
  if (s.length >= 5) for (const a of answerStems) if (a.length >= 5 && (a.startsWith(s.slice(0, 5)) || s.startsWith(a.slice(0, 5)))) return true;
  const syn = SYN[term.toLowerCase()] ?? SYN[s] ?? [];
  if (syn.some((x) => answerText.includes(x))) return true;
  if (/^O\(/.test(term)) return answerText.replace(/\s+/g, '').includes(term.toLowerCase().replace(/\s+/g, '')) || answerText.includes(term.slice(2, -1).toLowerCase());
  return false;
}

export function gradeOffline(card: Flashcard, answer: string): Grade {
  const text = answer.toLowerCase();
  const aStems = new Set(words(answer).map(stem));
  const ideas = keyIdeas(card.back);
  const covered: string[] = [], missed: string[] = [];
  let got = 0, total = 0;
  for (const idea of ideas) {
    const ts = [...new Set(terms(idea).map((t) => t))];
    const hit = ts.filter((t) => has(aStems, text, t)).length;
    const need = ts.length <= 2 ? 1 : Math.ceil(ts.length * 0.34);
    total += 1;
    if (hit >= need) { got += 1; covered.push(idea); } else if (hit > 0) { got += 0.4; missed.push(idea); } else missed.push(idea);
  }
  const wordCount = words(answer).length;
  let score = total ? got / total : 0;
  if (wordCount < 3) score = Math.min(score, 0.2);
  const verdict: Verdict = score >= 0.55 ? 'right' : score >= 0.25 ? 'partly' : 'missed';
  const feedback = verdict === 'right' ? 'You covered the main ideas.'
    : verdict === 'partly' ? `Part of it. Add: ${missed.slice(0, 2).map((m) => `"${shorten(m)}"`).join(' and ')}.`
    : wordCount < 3 ? 'Too short to judge. Say the idea in a full sentence, the way you would to an interviewer.'
    : `This misses the core of it. The key idea: "${shorten(ideas[0] ?? card.back)}".`;
  return { verdict, score, covered, missed, feedback };
}

/** Split on commas and arrows that are not inside parentheses. */
function splitTop(p: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (let i = 0; i < p.length; i++) {
    const ch = p[i];
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ',' || ch === '→')) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out.map((x) => x.replace(/^and\s+/i, '')).filter(Boolean);
}

const shorten = (s: string, n = 90) => (s.length <= n ? s : s.slice(0, n - 1) + '…');

/** Claude grades when it's available. Falls back to the offline grader on any problem. */
export async function gradeCard(card: Flashcard, answer: string, sample?: SampleFn | null): Promise<Grade> {
  const offline = gradeOffline(card, answer);
  if (!sample || !answer.trim()) return offline;
  try {
    const prompt = `You grade interview flashcard answers. Judge meaning, not wording. Spoken answers may have transcription errors.\n\nQuestion: ${card.front}\nReference answer: ${card.back}\nCandidate answer: ${answer}\n\nReply with only JSON: {"verdict":"right"|"partly"|"missed","missing":["short key ideas they left out"],"feedback":"one or two plain sentences: what was good, what to add or fix, and how to think about it"}`;
    const r = await sample(prompt, { cache: false });
    const j = JSON.parse(r.text.slice(r.text.indexOf('{'), r.text.lastIndexOf('}') + 1));
    if (!['right', 'partly', 'missed'].includes(j.verdict)) return offline;
    return { verdict: j.verdict, score: j.verdict === 'right' ? 1 : j.verdict === 'partly' ? 0.5 : 0, covered: offline.covered, missed: Array.isArray(j.missing) ? j.missing.slice(0, 4) : offline.missed, feedback: String(j.feedback ?? offline.feedback), byAI: true };
  } catch {
    return offline;
  }
}

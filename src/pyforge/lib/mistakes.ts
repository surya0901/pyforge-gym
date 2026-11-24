/**
 * One log of every mistake you make anywhere in pyforge, and the engine that turns it into
 * "train this next". Recent mistakes count more (a mistake halves in weight every 7 days),
 * and a weak spot fades once you stop making it.
 */
import { BLUEPRINTS, IDIOMS } from '../data/blueprints';
import { FINDER_BY_ID } from '../data/finder';
import { DECKS } from '../data/flashcards';
import { CODEBASES, PRACTICAL } from '../data/practical';
import type { Mode, Progress } from '../types';
import { getLocal, setLocal } from './storage';

export interface MistakeEntry { at: number; source: 'blueprint' | 'finder' | 'flashcards' | 'syntax' | 'bug' | 'oa' | 'practical'; kind: string; label: string; ref?: string }
const KEY = 'pyforge.mistakeLog';
const HALF_LIFE = 7 * 86_400_000;

export const mistakeLog = () => getLocal<MistakeEntry[]>(KEY, []);
export function logMistake(e: Omit<MistakeEntry, 'at'>) {
  setLocal(KEY, [...mistakeLog().slice(-1499), { ...e, at: Date.now() }]);
}

/** Python slips the Blueprint checker spots, by the start of its message. */
export const SLIP_KINDS: { re: RegExp; kind: string; title: string; fix: string }[] = [
  { re: /capitalizes booleans/, kind: 'slip:bool', title: 'Writing true / false in lowercase', fix: 'Python spells them True and False.' },
  { re: /uses None/, kind: 'slip:none', title: 'null instead of None', fix: 'Python\'s "no value" is None.' },
  { re: /\.append\(\), not \.push/, kind: 'slip:push', title: '.push() instead of .append()', fix: 'Lists grow with .append(x).' },
  { re: /len\(x\) for the length/, kind: 'slip:length', title: '.length instead of len()', fix: 'len(x) works on every container.' },
  { re: /and \/ or/, kind: 'slip:logic-ops', title: '&& / || instead of and / or', fix: 'Python uses the words and, or, not.' },
  { re: /uses not, not !/, kind: 'slip:not', title: '! instead of not', fix: 'Write if not seen: ...' },
  { re: /else if as elif/, kind: 'slip:elif', title: 'else if instead of elif', fix: 'One word: elif.' },
  { re: /no \+\+ or --/, kind: 'slip:incr', title: 'i++ instead of i += 1', fix: 'Python has no ++.' },
  { re: /sorts in place and returns None/, kind: 'slip:sort', title: 'x = x.sort()', fix: '.sort() returns None. Use sorted(x) for a new list.' },
  { re: /is a set\. Sets use \.add/, kind: 'slip:set-add', title: '.append() on a set', fix: 'Sets use .add(x).' },
  { re: /has to end with a colon/, kind: 'slip:colon', title: 'Missing colon after if / for / def', fix: 'Every line that opens a block ends with :' },
  { re: /Use == to compare/, kind: 'slip:assign-compare', title: '= where you meant ==', fix: '== compares, = stores.' },
  { re: /doesn't declare types/, kind: 'slip:types', title: 'Java or C style types (int x = 0)', fix: 'Just write x = 0.' },
  { re: /SAME list|\[\[\]\] \* n/, kind: 'slip:alias', title: '[[]] * n (lists that share memory)', fix: 'Use [[] for _ in range(n)].' },
];

const LOGIC: Record<string, { title: string; fix: string; drill: string[] }> = {
  off1: { title: 'Off by one at loop and range edges', fix: 'range(a, b) stops BEFORE b, the last index is len(x) - 1, and < vs <= decides if the edge is included.', drill: ['bp-binary-search', 'bp-koko', 'bp-product-except'] },
  alias: { title: 'Lists that share memory', fix: '[[]] * n and appending path without path[:] give many names for ONE list.', drill: ['bp-top-k', 'bp-subsets'] },
  return: { title: 'Returning at the wrong moment', fix: 'Ask: in which case is the answer known, and is the return inside the right block?', drill: ['bp-contains-dup', 'bp-valid-parens', 'bp-two-sum'] },
  type: { title: 'Picking the wrong data structure', fix: 'Set for "seen before?", dict for counts or index lookups, list for order.', drill: ['bp-longest-consecutive', 'bp-group-anagrams', 'bp-valid-anagram'] },
  path: { title: 'Values going off track mid loop', fix: 'Trace the first example by hand and write each variable after every line.', drill: ['bp-daily-temps', 'bp-house-robber', 'bp-buy-sell'] },
  value: { title: 'Wrong starting or final values', fix: 'Check what each variable must hold before the loop and after it.', drill: ['bp-buy-sell', 'bp-climbing', 'bp-container'] },
  missing: { title: 'Steps left out', fix: 'Say all the steps out loud before typing, then check each one is in the code.', drill: ['bp-two-sum', 'bp-valid-anagram'] },
  loop: { title: 'While loops that never end', fix: 'Something in the loop body must move toward making the condition false.', drill: ['bp-two-sum-sorted', 'bp-container', 'bp-valid-palindrome'] },
  error: { title: 'Code that crashes at runtime', fix: 'Read the error type: NameError is a typo, IndexError is a range edge, KeyError needs .get().', drill: ['bp-valid-anagram', 'bp-binary-search'] },
};

export interface WeakSpot {
  key: string;
  title: string;
  fix: string;
  weight: number;
  count: number;
  last: number;
  area: string;
  action: { label: string; mode: Mode; focus?: string; deck?: string; lesson?: string };
}

const decay = (at: number, now: number) => Math.pow(0.5, (now - at) / HALF_LIFE);

export function weakSpots(progress: Progress, mistakeLabels: Record<string, string> = {}): WeakSpot[] {
  const now = Date.now();
  const by = new Map<string, WeakSpot>();
  const add = (key: string, w: number, at: number, make: () => Omit<WeakSpot, 'key' | 'weight' | 'count' | 'last'>) => {
    const cur = by.get(key) ?? { key, weight: 0, count: 0, last: 0, ...make() };
    cur.weight += w; cur.count += 1; cur.last = Math.max(cur.last, at);
    by.set(key, cur);
  };

  for (const m of mistakeLog()) {
    const w = decay(m.at, now);
    if (m.kind.startsWith('slip:')) {
      const s = SLIP_KINDS.find((x) => x.kind === m.kind);
      if (s) add(m.kind, w, m.at, () => ({ title: s.title, fix: s.fix, area: 'Python syntax', action: { label: 'Drill it in Syntax recall', mode: 'syntax' } }));
    } else if (m.kind.startsWith('logic:')) {
      const c = m.kind.slice(6);
      const L = LOGIC[c] ?? LOGIC.path;
      const target = L.drill.find((id) => id !== m.ref) ?? L.drill[0];
      const bp = BLUEPRINTS.find((b) => b.id === target);
      add(m.kind, w, m.at, () => ({ title: L.title, fix: L.fix, area: 'Turning logic into code', action: { label: `Practice on ${bp?.title ?? 'a blueprint'}`, mode: 'blueprint', focus: target } }));
    } else if (m.kind.startsWith('pattern:')) {
      const id = m.kind.slice(8);
      const fp = FINDER_BY_ID[id];
      if (fp) add(m.kind, w, m.at, () => ({ title: `Spotting ${fp.name.toLowerCase()}`, fix: `${fp.name} fits when ${fp.fitsWhen}.`, area: 'Pattern recognition', action: fp.lesson ? { label: `Relearn the ${fp.name.toLowerCase()} lesson`, mode: 'learn', lesson: fp.lesson } : { label: 'Pattern finder', mode: 'pattern' } }));
    } else if (m.kind.startsWith('practical:')) {
      const id = m.kind.slice(10);
      const title = PRACTICAL.find((x) => x.id === id)?.title ?? CODEBASES.find((x) => x.id === id)?.title;
      if (title) add(m.kind, w, m.at, () => ({ title: `Missed cases in ${title.toLowerCase()}`, fix: `Last miss: ${m.label}. List edge cases before you type and trace one by hand before submitting.`, area: 'Practical rounds', action: { label: 'Back to that round', mode: 'practical', focus: id } }));
    } else if (m.kind.startsWith('card-')) {
      const d = DECKS.find((x) => `card-${x.id}` === m.kind);
      if (d) add(m.kind, w, m.at, () => ({ title: `${d.name} flashcards`, fix: 'Missed cards come back sooner. Say each answer out loud in your own words.', area: 'Interview knowledge', action: { label: `Review ${d.name}`, mode: 'cards', deck: d.id } }));
    }
  }

  // Python phrases you needed hints for in Blueprint builder
  const hints = getLocal<Record<string, number>>('pyforge.idiomHints', {});
  for (const [id, n] of Object.entries(hints)) {
    if (!IDIOMS[id] || n < 2) continue;
    const bp = BLUEPRINTS.find((b) => b.steps.some((s) => s.idioms.includes(id)));
    by.set(`idiom:${id}`, { key: `idiom:${id}`, title: `Recalling: ${IDIOMS[id].label.toLowerCase()}`, fix: IDIOMS[id].example, weight: Math.min(3, n * 0.35), count: n, last: 0, area: 'Python syntax',
      action: { label: bp ? `Type it again in ${bp.title}` : 'Blueprint builder', mode: 'blueprint', focus: bp?.id } });
  }

  // Older slips logged by Syntax recall and Bug hunter
  for (const [tag, n] of Object.entries(progress.mistakes ?? {})) {
    if (tag.startsWith('card-miss-') || tag === 'pattern-miss' || n < 2) continue;
    const key = `drill:${tag}`;
    by.set(key, { key, title: mistakeLabels[tag] ?? tag, fix: 'Shows up in your syntax and bug drills.', weight: Math.min(2.5, n * 0.25), count: n, last: 0, area: tag.startsWith('bug') ? 'Reading code' : 'Python syntax',
      action: tag.startsWith('bug') ? { label: 'Bug hunter', mode: 'bug' } : { label: 'Syntax recall', mode: 'syntax' } });
  }

  return [...by.values()].filter((x) => x.weight > 0.15).sort((a, b) => b.weight - a.weight);
}

/** The blueprint that best targets your top logic weakness, if you have one. */
export function blueprintForWeakness(): string | undefined {
  const now = Date.now();
  const w: Record<string, number> = {};
  for (const m of mistakeLog()) if (m.kind.startsWith('logic:')) w[m.kind.slice(6)] = (w[m.kind.slice(6)] ?? 0) + decay(m.at, now);
  const top = Object.entries(w).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 0.5) return undefined;
  return (LOGIC[top[0]] ?? LOGIC.path).drill[0];
}

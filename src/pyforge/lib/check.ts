/** Normalize code for comparison: unify quotes and drop all whitespace. */
export function normalize(code: string): string {
  return code.replace(/"/g, "'").replace(/\s+/g, '');
}

export function matches(input: string, answers: string[]): boolean {
  const n = normalize(input);
  if (!n) return false;
  return answers.some((a) => {
    if (a.startsWith('re:')) {
      try {
        return new RegExp(a.slice(3)).test(n);
      } catch {
        return false;
      }
    }
    return normalize(a) === n;
  });
}

export interface Diagnostic { tag: string; message: string }

/**
 * Explain WHY an answer is wrong, targeting the classic Python-under-pressure slips.
 * Returns the first matching diagnostics (most specific first).
 */
export function diagnose(input: string, answers: string[]): Diagnostic[] {
  const raw = input.trim();
  const n = normalize(raw);
  const expected = answers.filter((a) => !a.startsWith('re:'));
  const exp = expected.map(normalize).join(' | ');
  const out: Diagnostic[] = [];
  const add = (tag: string, message: string) => out.push({ tag, message });

  if (!n) return [{ tag: 'empty', message: 'Blank left empty.' }];

  if (/\b(true|false)\b/.test(raw)) add('bool-case', 'Python booleans are capitalized: True / False.');
  if (/\b(null|nil|none|undefined)\b/.test(raw)) add('none', 'Python uses None (capital N) — not null/none/undefined.');
  if (/&&|\|\||(^|[^=!<>])!(?!=)/.test(raw)) add('logic-ops', 'Use the words and / or / not, not && || !.');
  if (/\+\+|--\s*$/.test(raw)) add('incr', 'Python has no ++ / --. Use x += 1.');
  if (/\bthis\./.test(raw)) add('self', 'Inside a class it is self., not this.');
  if (/\.length\b|\.size\(\)|\.len\(\)/.test(raw)) add('len', 'Use len(x) — Python objects have no .length / .size().');

  if (/\.append\(/.test(raw) && /\.add\(/.test(exp)) add('set-append', 'Sets have no .append() — use .add(). (AttributeError at runtime.)');
  if (/\.add\(/.test(raw) && /\.append\(/.test(exp)) add('list-add', 'Lists use .append(); .add() is the set method.');
  if (/\.push\(/.test(raw)) add('push', 'No .push() in Python: lists use .append(x); heaps use heapq.heappush(heap, x).');

  if (/heapq\.(push|pop)\(/.test(raw)) add('heapq-name', 'heapq functions are heappush / heappop (with the "heap" prefix).');
  else if (/(^|[^.\w])heap\w*\.heappush|\w+\.heappop/.test(raw) && !/heapq\./.test(raw)) add('heapq-method', 'heapq is a MODULE of functions: heapq.heappush(heap, x), not heap.heappush(x).');
  else if (/^heappush|^heappop|[^.]heappush|[^.]heappop/.test(raw) && /heapq\./.test(exp) && !/heapq\./.test(raw)) add('heapq-prefix', 'Call it as heapq.heappush / heapq.heappop (we imported the module, not the names).');
  if (/heapq\.heappush\(\s*\w+\s*\)/.test(raw)) add('heapq-args', 'heappush takes TWO args: heapq.heappush(heap, item).');

  if (n === '{}' && /set\(\)/.test(exp)) add('empty-set', '{} is an empty dict. An empty set is set().');
  if (/\[\[.*\]\*\w+\]\*\w+/.test(n)) add('alias-2d', '[[0]*n]*m repeats ONE row object m times. Use [[0]*n for _ in range(m)].');
  if (/\.pop\(0\)/.test(n) || (/\.pop\(\)/.test(n) && /popleft/.test(exp))) add('deque-pop', 'BFS needs q.popleft() (O(1) from the front). .pop() takes from the right; list.pop(0) is O(n).');
  if (/popleft/.test(n) && /\.pop\(\)/.test(exp)) add('popleft-stack', 'A stack pops from the end: .pop(), not popleft().');
  if (/deque\((\w+)\)/.test(n) && /deque\(\[/.test(exp)) add('deque-iter', 'deque() takes an iterable — wrap a single item: deque([root]).');

  if (/^\w+$/.test(n) && /\[:\]|list\(|\.copy\(/.test(exp)) add('alias-path', 'Appending `path` stores a reference that later pops mutate. Snapshot it: path[:].');
  if (/[^/]\/[^/]/.test(n) && /\/\//.test(exp)) add('int-div', '/ is float division in Python 3. Use // for integer (floor) division.');
  if (/\/\//.test(n) && /int\(\w+\/\w+\)/.test(exp)) add('floor-trunc', '// floors toward −∞ (-7 // 2 == -4). Truncation toward zero needs int(a / b).');
  if (/^bisect\.bisect_(left|right)/.test(n) && /bisect_(left|right)/.test(exp)) {
    const mine = n.match(/bisect_(left|right)/)?.[1];
    const want = exp.match(/bisect_(left|right)/)?.[1];
    if (mine && want && mine !== want) add('bisect-side', `bisect_${mine} vs bisect_${want}: left = first index ≥ x, right = first index > x.`);
  }
  if (/sorted\(\w+\)$/.test(n) && /\.sort\(\)/.test(exp)) add('sorted-discard', 'sorted(x) returns a NEW list; as a bare statement it is discarded. Use x.sort() in place.');
  if (/\.sort\(\)/.test(n) && /sorted\(/.test(exp)) add('sort-none', '.sort() returns None. Use sorted(x) when you need the value.');
  if (/lru_cache\(\)?$/.test(n) && /lru_cache/.test(exp) && n !== 'lru_cache') add('lru-name', 'Import the name only: from functools import lru_cache.');
  if (/float\(inf\)|float\(-inf\)/.test(n)) add('inf-quotes', "infinity is float('inf') — the string needs quotes.");
  if (/random\.randint\(0,1\)/.test(n) && /random\(\)/.test(exp)) add('randint', 'randint(0, 1) returns 0 or 1. Use random.random() for a float in [0, 1).');

  // Comparator / off-by-one heuristics
  const flip = (s: string) => s.replace(/<=/g, '\u0001').replace(/</g, '<=').replace(/\u0001/g, '<').replace(/>=/g, '\u0002').replace(/>/g, '>=').replace(/\u0002/g, '>');
  if (expected.some((a) => normalize(flip(a)) === n)) add('off-by-one-cmp', 'Strict vs inclusive comparison flipped (< vs <=). Check the boundary case.');
  const stripPM = (s: string) => s.replace(/[+-]1(?![0-9])/g, '');
  if (!out.length && expected.some((a) => stripPM(normalize(a)) === stripPM(n) && normalize(a) !== n)) add('off-by-one', 'Off by one: check the ± 1 (inclusive length is r - l + 1; last index is len - 1).');
  if (!out.length && expected.some((a) => normalize(a).toLowerCase() === n.toLowerCase())) add('case', 'Capitalization is off — Python is case-sensitive.');
  if (!out.length && /\(/.test(n) && expected.some((a) => normalize(a).replace(/[()]/g, '') === n.replace(/[()]/g, ''))) add('parens', 'Right tokens, wrong parentheses (precedence or tuple grouping).');

  if (!out.length) add('other', 'Not quite — compare with the expected answer below.');
  return out;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

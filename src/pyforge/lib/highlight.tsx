import type { ReactNode } from 'react';

const KEYWORDS = new Set([
  'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'is', 'class', 'import', 'from',
  'as', 'with', 'try', 'except', 'finally', 'raise', 'lambda', 'yield', 'pass', 'break', 'continue', 'global',
  'nonlocal', 'del', 'assert',
]);
const CONSTANTS = new Set(['True', 'False', 'None', 'self']);
const BUILTINS = new Set([
  'len', 'range', 'enumerate', 'zip', 'min', 'max', 'sum', 'sorted', 'list', 'dict', 'set', 'tuple', 'int', 'float',
  'str', 'abs', 'any', 'all', 'map', 'filter', 'print', 'pow', 'divmod', 'reversed', 'ord', 'chr', 'bool', 'id',
  'isinstance', 'super', 'iter', 'next', 'frozenset',
  'deque', 'defaultdict', 'Counter', 'OrderedDict', 'heapq', 'bisect', 'lru_cache', 'cache', 'math', 'random',
]);

const TOKEN = /(#.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(@\w+)|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;

/** Tiny Python highlighter. Returns spans for a single line fragment. */
export function highlight(src: string, keyPrefix = ''): ReactNode[] {
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(src))) {
    const [t, com, str, deco, num, ident] = m;
    const k = `${keyPrefix}${i++}`;
    if (com) out.push(<span key={k} className="text-zinc-500 italic">{t}</span>);
    else if (str) out.push(<span key={k} className="text-emerald-300">{t}</span>);
    else if (deco) out.push(<span key={k} className="text-amber-300">{t}</span>);
    else if (num) out.push(<span key={k} className="text-orange-300">{t}</span>);
    else if (ident) {
      if (KEYWORDS.has(t)) out.push(<span key={k} className="text-violet-400">{t}</span>);
      else if (CONSTANTS.has(t)) out.push(<span key={k} className="text-orange-300">{t}</span>);
      else if (BUILTINS.has(t)) out.push(<span key={k} className="text-sky-300">{t}</span>);
      else if (src[TOKEN.lastIndex] === '(') out.push(<span key={k} className="text-blue-300">{t}</span>);
      else out.push(<span key={k} className="text-zinc-200">{t}</span>);
    } else out.push(<span key={k} className="text-zinc-400">{t}</span>);
  }
  return out;
}

export function CodeLine({ code }: { code: string }) {
  return <>{highlight(code)}</>;
}

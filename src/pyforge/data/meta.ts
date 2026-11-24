import type { CompanyId, PatternId } from '../types';

export const PATTERNS: { id: PatternId; name: string; short: string; tools: string }[] = [
  { id: 'arrays', name: 'Arrays & Hashing', short: 'Hashing', tools: 'set, dict, Counter, defaultdict, prefix sums' },
  { id: 'two-pointers', name: 'Two Pointers', short: '2 Ptr', tools: 'converging l/r, fast/slow, partition' },
  { id: 'sliding-window', name: 'Sliding Window', short: 'Window', tools: 'fixed & dynamic windows, freq maps' },
  { id: 'stack', name: 'Stack & Monotonic Stack', short: 'Stack', tools: 'list as stack, next greater, parsing' },
  { id: 'binary-search', name: 'Binary Search', short: 'BSearch', tools: 'lo/hi, bisect_left/right, answer space' },
  { id: 'linked-list', name: 'Linked Lists', short: 'LList', tools: 'dummy head, reversal, fast/slow, merge' },
  { id: 'trees', name: 'Trees (DFS & BFS)', short: 'Trees', tools: 'recursion, deque level order, LCA, BST' },
  { id: 'tries', name: 'Tries', short: 'Trie', tools: 'nested dict, TrieNode, setdefault' },
  { id: 'heaps', name: 'Heaps / Priority Queues', short: 'Heap', tools: 'heapq, negation, Top-K, tuple keys' },
  { id: 'backtracking', name: 'Backtracking', short: 'Backtrack', tools: 'path.append / bt / path.pop, pruning' },
  { id: 'graphs', name: 'Graphs (BFS, DFS, Grid)', short: 'Graphs', tools: 'visited set, 4-dir grid, components' },
  { id: 'adv-graphs', name: 'Advanced Graphs', short: 'Adv Graph', tools: "Kahn's topo, Dijkstra, Union-Find" },
  { id: 'dp-1d', name: '1D Dynamic Programming', short: 'DP 1D', tools: '@lru_cache, tabulation, rolling vars' },
  { id: 'dp-2d', name: '2D Dynamic Programming', short: 'DP 2D', tools: 'grid DP, knapsack, LCS, edit distance' },
  { id: 'greedy', name: 'Greedy & Intervals', short: 'Intervals', tools: 'sort by start/end, merge, sweep line' },
  { id: 'bits', name: 'Bit Manipulation', short: 'Bits', tools: 'XOR, masks, shifts, n & (n - 1)' },
  { id: 'math', name: 'Math, Geometry & Probability', short: 'Math/Sim', tools: 'mod arithmetic, Monte Carlo, state machines' },
  { id: 'ds-scratch', name: 'Data Structures From Scratch', short: 'DS Build', tools: 'LRU, ring buffer, heap, order book' },
];

export const PATTERN_NAME = Object.fromEntries(PATTERNS.map((p) => [p.id, p.name])) as Record<PatternId, string>;

export const COMPANIES: { id: CompanyId; name: string; tier: 'quant' | 'bigtech' | 'bank' }[] = [
  { id: 'citadel', name: 'Citadel', tier: 'quant' },
  { id: 'hrt', name: 'Hudson River Trading', tier: 'quant' },
  { id: 'janestreet', name: 'Jane Street', tier: 'quant' },
  { id: 'meta', name: 'Meta', tier: 'bigtech' },
  { id: 'google', name: 'Google', tier: 'bigtech' },
  { id: 'openai', name: 'OpenAI', tier: 'bigtech' },
  { id: 'nvidia', name: 'Nvidia', tier: 'bigtech' },
  { id: 'amazon', name: 'Amazon', tier: 'bigtech' },
  { id: 'microsoft', name: 'Microsoft', tier: 'bigtech' },
  { id: 'apple', name: 'Apple', tier: 'bigtech' },
  { id: 'netflix', name: 'Netflix', tier: 'bigtech' },
  { id: 'goldman', name: 'Goldman Sachs', tier: 'bank' },
  { id: 'jpmorgan', name: 'JPMorgan Chase', tier: 'bank' },
];

export const COMPANY_NAME = Object.fromEntries(COMPANIES.map((c) => [c.id, c.name])) as Record<CompanyId, string>;

/** Answer choices for the "primary data structure" half of the speed drill. */
export const DS_CHOICES = [
  'dict / Counter',
  'set',
  'two indices (l, r)',
  'deque',
  'heapq',
  'list as stack',
  'bisect on sorted list',
  'lo / hi bounds',
  'Union-Find',
  'Trie (nested dict)',
  'DP table / @lru_cache',
  'OrderedDict / DLL + dict',
  'int bitmask / XOR',
  'random + counters loop',
];

import type { PatternId } from '../types';

/**
 * Answer choices for the pattern finder. The first 16 are the lessons;
 * the rest are patterns interviews use that sit next to them.
 */
export interface FinderPattern { id: string; name: string; fitsWhen: string; lesson?: string; drill: PatternId }

export const FINDER_PATTERNS: FinderPattern[] = [
  { id: 'hashing', name: 'Hash map / set', lesson: 'hashing', drill: 'arrays', fitsWhen: 'you need instant "have I seen this?" lookups, counting, or grouping by a key in one pass' },
  { id: 'prefix-sum', name: 'Prefix sum', lesson: 'prefix-sum', drill: 'arrays', fitsWhen: 'you need sums over ranges, or must count subarrays with a target sum (even with negatives)' },
  { id: 'two-pointers', name: 'Two pointers', lesson: 'two-pointers', drill: 'two-pointers', fitsWhen: 'the input is sorted (or sortable) and two ends can move toward each other, or you rearrange in place' },
  { id: 'sliding-window', name: 'Sliding window', lesson: 'sliding-window', drill: 'sliding-window', fitsWhen: 'the answer is a contiguous range and you can grow the right edge and shrink the left to keep a rule true' },
  { id: 'fast-slow', name: 'Fast and slow pointers', lesson: 'fast-slow', drill: 'linked-list', fitsWhen: 'you detect a cycle or find a middle in O(1) space' },
  { id: 'reverse-ll', name: 'Linked list reversal / rewiring', lesson: 'reverse-ll', drill: 'linked-list', fitsWhen: 'you rearrange linked list nodes by changing next pointers' },
  { id: 'monotonic-stack', name: 'Stack / monotonic stack', lesson: 'monotonic-stack', drill: 'stack', fitsWhen: 'each item waits for the next bigger or smaller item, or things match last-in first-out like brackets' },
  { id: 'top-k', name: 'Heap (top K / priority queue)', lesson: 'top-k', drill: 'heaps', fitsWhen: 'you repeatedly need the current smallest or largest, or only the best k items matter' },
  { id: 'intervals', name: 'Intervals (sort and sweep)', lesson: 'intervals', drill: 'greedy', fitsWhen: 'the input is [start, end] ranges that you merge, count or schedule' },
  { id: 'binary-search', name: 'Binary search', lesson: 'binary-search', drill: 'binary-search', fitsWhen: 'data is sorted, or a yes/no check flips once as a value grows, and O(log N) per step is the goal' },
  { id: 'tree-traversal', name: 'Tree DFS (recursion)', lesson: 'tree-traversal', drill: 'trees', fitsWhen: 'the input is a tree and each node\'s answer comes from its children\'s answers' },
  { id: 'dfs', name: 'Graph DFS', lesson: 'dfs', drill: 'graphs', fitsWhen: 'you explore everything reachable, count components, or detect cycles in a graph' },
  { id: 'bfs', name: 'BFS (shortest steps / levels)', lesson: 'bfs', drill: 'graphs', fitsWhen: 'you need the fewest steps with equal-cost moves, or level by level processing' },
  { id: 'matrix', name: 'Grid traversal (DFS/BFS on a matrix)', lesson: 'matrix', drill: 'graphs', fitsWhen: 'the input is a 2D grid and connected cells form regions' },
  { id: 'backtracking', name: 'Backtracking', lesson: 'backtracking', drill: 'backtracking', fitsWhen: 'you must list every valid combination, permutation or arrangement' },
  { id: 'dp', name: 'Dynamic programming', lesson: 'dp', drill: 'dp-1d', fitsWhen: 'you count ways or optimize, choices overlap, and the same subproblems repeat' },
  { id: 'greedy', name: 'Greedy', drill: 'greedy', fitsWhen: 'taking the locally best choice at each step is provably safe, so no backtracking is needed' },
  { id: 'topo-sort', name: 'Topological sort', lesson: 'dfs', drill: 'adv-graphs', fitsWhen: 'tasks have "must come before" dependencies and you need a valid order' },
  { id: 'union-find', name: 'Union-Find', drill: 'adv-graphs', fitsWhen: 'you merge groups as edges arrive and ask whether two things are already connected' },
  { id: 'dijkstra', name: 'Dijkstra (weighted shortest path)', lesson: 'bfs', drill: 'adv-graphs', fitsWhen: 'edges have different non-negative costs and you need the cheapest path' },
  { id: 'trie', name: 'Trie (prefix tree)', drill: 'tries', fitsWhen: 'you search many words by prefix' },
  { id: 'bits', name: 'Bit manipulation', drill: 'bits', fitsWhen: 'XOR cancelling, masks or counting bits does the work in O(1) space' },
  { id: 'design', name: 'Design: hash map + linked list', drill: 'ds-scratch', fitsWhen: 'you build a structure that needs O(1) lookup plus O(1) reordering, like a cache' },
];

export const FINDER_BY_ID = Object.fromEntries(FINDER_PATTERNS.map((p) => [p.id, p])) as Record<string, FinderPattern>;

import { LESSONS } from '../data/lessons';
import { PATTERN_NAME } from '../data/meta';
import { NEETCODE, type NCProblem } from '../data/neetcode';
import type { Exercise, PatternId, Progress } from '../types';
import { getLocal, setLocal } from './storage';

/**
 * The roadmap follows NeetCode's own tree: a pattern opens once the
 * patterns above it are complete. Complete = half of its NeetCode 150
 * problems solved. A pattern's drills unlock once you open its lesson or
 * solve any of its problems (even before the roadmap reaches it), and a drill tied to a specific NeetCode
 * problem unlocks as soon as you solve that problem.
 */
export interface RoadNode { id: PatternId; x: number; row: number; parents: PatternId[]; lessons: string[]; short?: string }

export const ROADMAP: RoadNode[] = [
  { id: 'arrays', x: 50, row: 0, parents: [], lessons: ['hashing', 'prefix-sum'] },
  { id: 'two-pointers', x: 32, row: 1, parents: ['arrays'], lessons: ['two-pointers'] },
  { id: 'stack', x: 68, row: 1, parents: ['arrays'], lessons: ['monotonic-stack'], short: 'Stack' },
  { id: 'binary-search', x: 14, row: 2, parents: ['two-pointers'], lessons: ['binary-search'] },
  { id: 'sliding-window', x: 40, row: 2, parents: ['two-pointers'], lessons: ['sliding-window'] },
  { id: 'linked-list', x: 66, row: 2, parents: ['two-pointers'], lessons: ['fast-slow', 'reverse-ll'], short: 'Linked List' },
  { id: 'trees', x: 40, row: 3, parents: ['binary-search', 'linked-list'], lessons: ['tree-traversal'], short: 'Trees' },
  { id: 'tries', x: 12, row: 4, parents: ['trees'], lessons: [], short: 'Tries' },
  { id: 'heaps', x: 40, row: 4, parents: ['trees'], lessons: ['top-k'], short: 'Heap / PQ' },
  { id: 'backtracking', x: 70, row: 4, parents: ['trees'], lessons: ['backtracking'] },
  { id: 'greedy', x: 10, row: 5, parents: ['heaps'], lessons: ['intervals'], short: 'Greedy / Intervals' },
  { id: 'adv-graphs', x: 34, row: 5, parents: ['heaps', 'graphs'], lessons: ['dfs', 'bfs'], short: 'Advanced Graphs' },
  { id: 'graphs', x: 60, row: 5, parents: ['backtracking'], lessons: ['dfs', 'bfs', 'matrix'], short: 'Graphs' },
  { id: 'dp-1d', x: 86, row: 5, parents: ['backtracking'], lessons: ['dp'], short: '1-D DP' },
  { id: 'ds-scratch', x: 74, row: 3, parents: ['linked-list'], lessons: [], short: 'DS from scratch' },
  { id: 'dp-2d', x: 60, row: 6, parents: ['graphs', 'dp-1d'], lessons: ['dp'], short: '2-D DP' },
  { id: 'bits', x: 86, row: 6, parents: ['dp-1d'], lessons: [], short: 'Bit Manipulation' },
  { id: 'math', x: 86, row: 7, parents: ['bits'], lessons: [], short: 'Math & Geometry' },
];

export const nodeName = (id: PatternId) => ROADMAP.find((n) => n.id === id)?.short ?? PATTERN_NAME[id];

export type NodeState = 'locked' | 'open' | 'done';
export interface NodeStatus {
  node: RoadNode; state: NodeState; problems: NCProblem[]; solved: number; need: number;
  lessonsOpened: number; drillsOpen: boolean; blockers: PatternId[];
}

export function roadmapStatus(p: Progress, solved: Set<string>): Record<PatternId, NodeStatus> {
  const out = {} as Record<PatternId, NodeStatus>;
  const complete = (id: PatternId): boolean => {
    const probs = NEETCODE.filter((x) => x.pattern === id);
    if (!probs.length) return ROADMAP.find((n) => n.id === id)!.parents.every(complete);
    return probs.filter((x) => solved.has(x.slug)).length >= Math.ceil(probs.length / 2);
  };
  for (const node of ROADMAP) {
    const problems = NEETCODE.filter((x) => x.pattern === node.id);
    const solvedN = problems.filter((x) => solved.has(x.slug)).length;
    const need = Math.ceil(problems.length / 2);
    const blockers = node.parents.filter((pid) => !complete(pid));
    const state: NodeState = blockers.length ? 'locked' : complete(node.id) && problems.length ? 'done' : 'open';
    const lessonsOpened = node.lessons.filter((l) => p.lessons?.[l]?.opened).length;
    // Learning or solving always counts, even ahead of the roadmap. Patterns with no lesson open with the roadmap.
    const drillsOpen = lessonsOpened > 0 || solvedN > 0 || (state !== 'locked' && node.lessons.length === 0);
    out[node.id] = { node, state, problems, solved: solvedN, need, lessonsOpened, drillsOpen, blockers };
  }
  return out;
}

/** Drill ids tied to a solved NeetCode problem. */
export function solvedDrillIds(solved: Set<string>, all: Exercise[]): Set<string> {
  const ids = new Set<string>();
  for (const prob of NEETCODE) if (solved.has(prob.slug)) prob.drills.forEach((d) => ids.add(d));
  for (const e of all) if (e.kind === 'pattern' && e.nc && solved.has(e.nc)) ids.add(e.id);
  return ids;
}

export function isUnlocked(e: Exercise, status: Record<PatternId, NodeStatus>, viaSolved: Set<string>): boolean {
  return viaSolved.has(e.id) || !!status[e.pattern]?.drillsOpen;
}

const KEY = 'pyforge.unlockAll';
export const getUnlockAll = () => getLocal(KEY, false);
export const saveUnlockAll = (v: boolean) => setLocal(KEY, v);

export const lessonsFor = (id: PatternId) => ROADMAP.find((n) => n.id === id)?.lessons.map((l) => LESSONS.find((x) => x.id === l)!).filter(Boolean) ?? [];

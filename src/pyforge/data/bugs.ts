import type { BugExercise } from '../types';

type B = Omit<BugExercise, 'kind'>;
const b = (x: B): BugExercise => ({ kind: 'bug', ...x });

export const BUGS: BugExercise[] = [
  b({
    id: 'bug-first-dup', title: 'First Duplicate', pattern: 'arrays', difficulty: 'easy',
    companies: ['amazon', 'apple', 'meta', 'citadel', 'goldman', 'jpmorgan'],
    prompt: 'Return the first value that appears twice, else -1.',
    code: `def first_duplicate(nums):
    seen = set()
    for x in nums:
        if x in set():
            return x
        seen.append(x)
    return -1`,
    bugs: [
      { line: 4, options: ['        if x in seen:', '        if x not in seen:', '        if seen.has(x):'],
        explanation: '`set()` builds a brand-new empty set every iteration, so the check is always False and the function returns -1 for every input.' },
      { line: 6, options: ['        seen.add(x)', '        seen.push(x)', '        seen += x'],
        explanation: 'Sets have no .append — AttributeError: \'set\' object has no attribute \'append\'. Use .add().' },
    ],
  }),
  b({
    id: 'bug-two-sum-sorted', title: 'Two Sum II (sorted input)', pattern: 'two-pointers', difficulty: 'easy',
    companies: ['amazon', 'meta', 'microsoft', 'google', 'goldman', 'jpmorgan'],
    prompt: 'Return indices of two numbers summing to target in a sorted array.',
    code: `def two_sum_sorted(nums, target):
    l, r = 0, len(nums)
    while l < r:
        s = nums[l] + nums[r]
        if s == target:
            return [l, r]
        if s < target:
            r -= 1
        else:
            l += 1
    return []`,
    bugs: [
      { line: 2, options: ['    l, r = 0, len(nums) - 1', '    l, r = 1, len(nums)', '    l, r = 0, len(nums) + 1'],
        explanation: 'r = len(nums) is one past the end — nums[r] raises IndexError on the first iteration.' },
      { line: 8, options: ['            l += 1', '            r += 1', '            l -= 1'],
        explanation: 'Sum too small → need a bigger number → move the LEFT pointer right.' },
      { line: 10, options: ['            r -= 1', '            l -= 1', '            r += 1'],
        explanation: 'Sum too large → need a smaller number → move the RIGHT pointer left.' },
    ],
  }),
  b({
    id: 'bug-min-subarray', title: 'Minimum Size Subarray Sum', pattern: 'sliding-window', difficulty: 'medium',
    companies: ['meta', 'google', 'amazon', 'hrt', 'goldman', 'jpmorgan'],
    prompt: 'Smallest window length with sum >= target (positive ints).',
    code: `def min_subarray_len(target, nums):
    l = total = 0
    best = float('inf')
    for r in range(len(nums)):
        total += nums[r]
        if total >= target:
            best = min(best, r - l)
            total -= nums[l]
            l += 1
    return 0 if best == float('inf') else best`,
    bugs: [
      { line: 6, options: ['        while total >= target:', '        if total > target:', '        elif total >= target:'],
        explanation: 'Shrinking only once per step misses shorter windows. target=7, [1,1,1,1,7] needs several shrinks after adding 7 to reach length 1.' },
      { line: 7, options: ['            best = min(best, r - l + 1)', '            best = max(best, r - l + 1)', '            best = min(best, r - l - 1)'],
        explanation: 'Window [l..r] is inclusive, its length is r - l + 1. Off-by-one under-reports every answer.' },
    ],
  }),
  b({
    id: 'bug-next-greater', title: 'Next Greater Element', pattern: 'stack', difficulty: 'medium',
    companies: ['meta', 'google', 'amazon', 'citadel', 'goldman', 'jpmorgan'],
    prompt: 'res[i] = first value to the right greater than nums[i], else -1.',
    code: `def next_greater(nums):
    res = [-1] * len(nums)
    stack = []
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] > x:
            res[stack.pop()] = x
        stack.append(x)
    return res`,
    bugs: [
      { line: 5, options: ['        while stack and nums[stack[-1]] < x:', '        while stack and nums[stack[-1]] >= x:', '        if stack and nums[stack[-1]] < x:'],
        explanation: 'We resolve waiting elements that are SMALLER than x. The flipped comparison computes "next smaller".' },
      { line: 7, options: ['        stack.append(i)', '        stack.append(nums[i - 1])', '        stack.push(i)'],
        explanation: 'The stack must hold INDICES — line 5 does nums[stack[-1]] and line 6 writes res[index]. Pushing values gives wrong slots or IndexError.' },
    ],
  }),
  b({
    id: 'bug-binary-search', title: 'Binary Search', pattern: 'binary-search', difficulty: 'easy',
    companies: ['google', 'microsoft', 'apple', 'nvidia', 'meta', 'goldman', 'jpmorgan'],
    prompt: 'Classic search in a sorted array.',
    code: `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid
        else:
            hi = mid - 1
    return -1`,
    bugs: [
      { line: 3, options: ['    while lo <= hi:', '    while lo < hi - 1:', '    while hi > 0:'],
        explanation: 'With a closed interval [lo, hi], lo == hi is still one candidate. search([5], 5) returns -1.' },
      { line: 8, options: ['            lo = mid + 1', '            hi = mid + 1', '            lo = mid - 1'],
        explanation: 'lo = mid never advances when hi = lo + 1 (mid == lo) → infinite loop.' },
    ],
  }),
  b({
    id: 'bug-remove-nth', title: 'Remove Nth From End', pattern: 'linked-list', difficulty: 'medium',
    companies: ['meta', 'amazon', 'microsoft', 'apple', 'goldman', 'jpmorgan'],
    prompt: 'Remove the nth node from the end in one pass.',
    code: `def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = head
    for _ in range(n):
        fast = fast.next
    while fast.next:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return head`,
    bugs: [
      { line: 3, options: ['    fast = slow = dummy', '    fast = slow = head.next', '    fast, slow = head, dummy.next'],
        explanation: 'Starting at head means removing the HEAD (n == length) crashes: fast becomes None and fast.next raises AttributeError. Start both at dummy.' },
      { line: 10, options: ['    return dummy.next', '    return slow', '    return head.next'],
        explanation: 'If the head was removed, `head` still points at the deleted node. dummy.next is always the real head.' },
    ],
  }),
  b({
    id: 'bug-max-depth-bfs', title: 'Max Depth (BFS)', pattern: 'trees', difficulty: 'easy',
    companies: ['amazon', 'meta', 'microsoft', 'netflix', 'goldman', 'jpmorgan'],
    prompt: 'Count levels with BFS.',
    code: `from collections import deque

def max_depth(root):
    if not root:
        return 0
    q = deque([root])
    depth = 0
    while q:
        depth += 1
        for _ in range(len(q)):
            node = q.pop()
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
    return depth`,
    bugs: [
      { line: 11, options: ['            node = q.popleft()', '            node = q.pop(0)', '            node = q[0]'],
        explanation: 'q.pop() takes from the RIGHT, i.e. the children just appended — levels mix and depth comes out wrong (LIFO = DFS order). BFS needs popleft().' },
    ],
  }),
  b({
    id: 'bug-trie', title: 'Dict Trie insert/search', pattern: 'tries', difficulty: 'medium',
    companies: ['google', 'amazon', 'openai', 'goldman', 'jpmorgan'],
    prompt: 'Nested dict trie; "$" marks end of word.',
    code: `class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.get(ch, {})
        node['$'] = True

    def search(self, word):
        node = self.root
        for ch in word:
            if ch not in node:
                return False
            node = node[ch]
        return True`,
    bugs: [
      { line: 8, options: ['            node = node.setdefault(ch, {})', '            node[ch] = {}', '            node = node.get(ch) or {}'],
        explanation: '.get(ch, {}) returns a NEW dict without storing it, so nothing is ever inserted. setdefault stores and returns it.' },
      { line: 17, options: ["        return '$' in node", '        return node is not None', '        return bool(node)'],
        explanation: 'Returns True for any prefix: insert("apple"), search("app") → True. Must check the end marker.' },
    ],
  }),
  b({
    id: 'bug-topk-heap', title: 'Top K Frequent (heap)', pattern: 'heaps', difficulty: 'medium',
    companies: ['amazon', 'meta', 'google', 'netflix', 'citadel', 'goldman', 'jpmorgan'],
    prompt: 'Keep a size-k heap of the most frequent values.',
    code: `import heapq

def top_k_frequent(nums, k):
    count = {}
    for x in nums:
        count[x] = count.get(x, 0) + 1
    heap = []
    for x, f in count.items():
        heapq.heappush(heap, (-f, x))
        if len(heap) > k:
            heapq.heappop(heap)
    return [x for f, x in heap]`,
    bugs: [
      { line: 9, options: ['        heapq.heappush(heap, (f, x))', '        heapq.heappush(heap, (x, f))', '        heapq.heappush(heap, -f)'],
        explanation: 'Size-k min-heap evicts the SMALLEST item. Negating makes the most frequent the smallest — so it gets popped. You end up with the k LEAST frequent.' },
    ],
  }),
  b({
    id: 'bug-merge-k-lists', title: 'Merge K Linked Lists', pattern: 'heaps', difficulty: 'hard',
    companies: ['google', 'meta', 'amazon', 'hrt', 'openai', 'goldman', 'jpmorgan'],
    prompt: 'Heap-merge k sorted linked lists.',
    code: `import heapq

def merge_k_lists(lists):
    heap = []
    for node in lists:
        if node:
            heapq.heappush(heap, (node.val, node))
    dummy = tail = ListNode()
    while heap:
        _, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, node.next))
    return dummy.next`,
    bugs: [
      { line: 7, options: ['            heapq.heappush(heap, (node.val, id(node), node))', '            heapq.heappush(heap, node)', '            heapq.heappush(heap, (node, node.val))'],
        explanation: 'Equal vals make tuple comparison fall through to ListNode < ListNode → TypeError. Add a unique tiebreaker (id or counter).' },
      { line: 10, options: ['        _, _, node = heapq.heappop(heap)', '        node = heapq.heappop(heap)[1]', '        _, node = heap.pop()'],
        explanation: 'Tuples now have three fields; unpack all three.' },
      { line: 14, options: ['            heapq.heappush(heap, (node.next.val, id(node.next), node.next))', '            heapq.heappush(heap, node.next)', '            heap.append((node.next.val, node.next))'],
        explanation: 'Same tiebreaker needed for every push.' },
    ],
  }),
  b({
    id: 'bug-combine', title: 'Combinations n choose k', pattern: 'backtracking', difficulty: 'medium',
    companies: ['meta', 'amazon', 'microsoft', 'goldman', 'jpmorgan'],
    prompt: 'All k-combinations of 1..n.',
    code: `def combine(n, k):
    res, path = [], []
    def bt(start):
        if len(path) == k:
            res.append(path)
            return
        for i in range(start, n + 1):
            path.append(i)
            bt(i)
            path.pop()
    bt(1)
    return res`,
    bugs: [
      { line: 5, options: ['            res.append(path[:])', '            res.extend(path)', '            res += path'],
        explanation: 'Appends a reference to the single `path` list, which is popped to [] at the end → result is [[], [], ...].' },
      { line: 9, options: ['            bt(i + 1)', '            bt(start + 1)', '            bt(i - 1)'],
        explanation: 'bt(i) lets i be chosen again → [1, 1] appears. Combinations need strictly increasing picks.' },
    ],
  }),
  b({
    id: 'bug-islands-sink', title: 'Number of Islands (sink)', pattern: 'graphs', difficulty: 'medium',
    companies: ['amazon', 'meta', 'google', 'microsoft', 'nvidia', 'goldman', 'jpmorgan'],
    prompt: 'Count islands by sinking visited land.',
    code: `def num_islands(grid):
    rows, cols = len(grid), len(grid[0])
    def sink(r, c):
        if r < 0 or c < 0 or r > rows or c > cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sink(r + dr, c + dc)
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                sink(r, c)
            count += 1
    return count`,
    bugs: [
      { line: 4, options: ["        if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] != '1':", "        if r <= 0 or c <= 0 or r > rows or c > cols or grid[r][c] != '1':", "        if not (0 < r < rows and 0 < c < cols) or grid[r][c] != '1':"],
        explanation: 'r == rows is out of range: grid[rows] raises IndexError for land on the bottom/right edge.' },
      { line: 14, options: ['                count += 1', '            count = count + 1', '        count += 1'],
        explanation: 'Mis-indented: counts every CELL instead of every island. Must be inside the if.' },
    ],
  }),
  b({
    id: 'bug-bfs-dist', title: 'BFS Distances', pattern: 'graphs', difficulty: 'easy',
    companies: ['google', 'meta', 'openai', 'amazon', 'goldman', 'jpmorgan'],
    prompt: 'Shortest hop count from src to every reachable node.',
    code: `from collections import deque

def bfs_dist(graph, src):
    dist = {src: 0}
    q = deque([src])
    while q:
        u = q.popleft()
        for v in graph[u]:
            if v not in dist:
                q.append(v)
    return dist`,
    bugs: [
      { line: 10, options: ['                dist[v] = dist[u] + 1; q.append(v)', '                q.append(v); dist[u] += 1', '                dist[v] = 1; q.append(v)'],
        explanation: 'v is never marked, so `v not in dist` stays True: duplicates flood the queue (infinite loop on cycles). Mark visited ON PUSH.' },
    ],
  }),
  b({
    id: 'bug-course-schedule', title: 'Course Schedule (Kahn)', pattern: 'adv-graphs', difficulty: 'medium',
    companies: ['google', 'amazon', 'meta', 'nvidia', 'openai', 'goldman', 'jpmorgan'],
    prompt: 'Can all courses be finished?',
    code: `from collections import deque

def can_finish(n, prereqs):
    graph = [[]] * n
    indeg = [0] * n
    for a, b in prereqs:
        graph[b].append(a)
        indeg[a] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    taken = 0
    while q:
        u = q.popleft()
        taken += 1
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return taken == n`,
    bugs: [
      { line: 4, options: ['    graph = [[] for _ in range(n)]', '    graph = [] * n', '    graph = list([]) * n'],
        explanation: '[[]] * n makes n references to ONE list — every node gets every edge. Indegrees then go negative and the answer is wrong.' },
    ],
  }),
  b({
    id: 'bug-network-delay', title: 'Network Delay (Dijkstra)', pattern: 'adv-graphs', difficulty: 'medium',
    companies: ['google', 'amazon', 'citadel', 'hrt', 'goldman', 'jpmorgan'],
    prompt: 'Time for a signal from k to reach all n nodes.',
    code: `import heapq

def network_delay(times, n, k):
    graph = {i: [] for i in range(1, n + 1)}
    for u, v, w in times:
        graph[u].append((v, w))
    dist = {}
    heap = [(0, k)]
    while heap:
        d, u = heapq.heappop(heap)
        if u in dist:
            continue
        dist[u] = d
        for v, w in graph[u]:
            heapq.heappush(heap, (w, v))
    return max(dist.values()) if len(dist) == n else -1`,
    bugs: [
      { line: 15, options: ['            heapq.heappush(heap, (d + w, v))', '            heapq.heappush(heap, (v, d + w))', '            heapq.heappush(heap, (w, u))'],
        explanation: 'Pushing edge weight w alone forgets the distance so far. Priority must be the cumulative d + w.' },
    ],
  }),
  b({
    id: 'bug-coin-change', title: 'Coin Change', pattern: 'dp-1d', difficulty: 'medium',
    companies: ['amazon', 'google', 'meta', 'goldman', 'jpmorgan'],
    prompt: 'Fewest coins making amount.',
    code: `def coin_change(coins, amount):
    dp = [0] + [amount + 1] * amount
    for a in range(1, amount):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] <= amount else -1`,
    bugs: [
      { line: 3, options: ['    for a in range(1, amount + 1):', '    for a in range(amount):', '    for a in range(0, amount + 1):'],
        explanation: 'range excludes its stop, so dp[amount] is never computed — it stays amount+1 and the function returns -1.' },
    ],
  }),
  b({
    id: 'bug-unique-paths', title: 'Unique Paths', pattern: 'dp-2d', difficulty: 'easy',
    companies: ['google', 'amazon', 'apple', 'meta', 'goldman', 'jpmorgan'],
    prompt: 'Paths from top-left to bottom-right moving right/down.',
    code: `def unique_paths(m, n):
    dp = [[0] * n] * m
    for c in range(n):
        dp[0][c] = 1
    for r in range(m):
        dp[r][0] = 1
    for r in range(1, m):
        for c in range(1, n):
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1]
    return dp[m - 1][n - 1]`,
    bugs: [
      { line: 2, options: ['    dp = [[0] * n for _ in range(m)]', '    dp = [[0] * m] * n', '    dp = [0] * (m * n)'],
        explanation: 'Shallow copy: all m rows are the SAME list, so writing dp[r][c] writes every row. unique_paths(3, 3) gives a wrong count.' },
    ],
  }),
  b({
    id: 'bug-edit-distance', title: 'Edit Distance', pattern: 'dp-2d', difficulty: 'hard',
    companies: ['google', 'microsoft', 'openai', 'amazon', 'goldman', 'jpmorgan'],
    prompt: 'Min insert/delete/replace ops to turn a into b.',
    code: `def edit_distance(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i] == b[j]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]`,
    bugs: [
      { line: 10, options: ['            if a[i - 1] == b[j - 1]:', '            if a[i] == b[j - 1]:', '            if dp[i][j] == 0:'],
        explanation: 'dp is 1-indexed over prefixes; a[i] reads past the end when i == m → IndexError.' },
      { line: 13, options: ['                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])', '                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])', '                dp[i][j] = min(dp[i - 1][j], dp[i][j - 1]) + 2'],
        explanation: 'Every insert/delete/replace costs one operation; without + 1 the answer is always 0 past the base row.' },
    ],
  }),
  b({
    id: 'bug-merge-intervals', title: 'Merge Intervals', pattern: 'greedy', difficulty: 'medium',
    companies: ['meta', 'google', 'amazon', 'netflix', 'citadel', 'goldman', 'jpmorgan'],
    prompt: 'Merge all overlapping intervals.',
    code: `def merge(intervals):
    intervals.sort(key=lambda x: x[1])
    out = []
    for start, end in intervals:
        if out and start < out[-1][1]:
            out[-1][1] = end
        else:
            out.append([start, end])
    return out`,
    bugs: [
      { line: 2, options: ['    intervals.sort()', '    intervals = sorted(intervals, reverse=True)', '    intervals.sort(key=lambda x: -x[1])'],
        explanation: 'Sorting by END breaks merging: [[2,3],[1,10]] merges into [2,10], losing start 1. Sort by start.' },
      { line: 5, options: ['        if out and start <= out[-1][1]:', '        if out and start > out[-1][1]:', '        if start < out[-1][0]:'],
        explanation: 'Touching intervals [1,2],[2,3] must merge; < misses them.' },
      { line: 6, options: ['            out[-1][1] = max(out[-1][1], end)', '            out[-1][0] = start', '            out[-1] = [start, end]'],
        explanation: 'A contained interval ([1,10],[2,3]) would SHRINK the end to 3. Take the max.' },
    ],
  }),
  b({
    id: 'bug-bits-precedence', title: 'Bit Tricks & Precedence', pattern: 'bits', difficulty: 'medium',
    companies: ['nvidia', 'apple', 'hrt', 'janestreet'],
    prompt: 'Count bits for 0..n, and test power of two.',
    code: `def count_bits(n):
    res = [0] * (n + 1)
    for i in range(1, n + 1):
        res[i] = res[i >> 1] + i & 1
    return res

def is_power_of_two(n):
    return n & (n - 1) == 0`,
    bugs: [
      { line: 4, options: ['        res[i] = res[i >> 1] + (i & 1)', '        res[i] = res[i << 1] + (i & 1)', '        res[i] = res[i >> 1] & 1'],
        explanation: '+ binds tighter than &, so this is (res[i>>1] + i) & 1 — always 0 or 1.' },
      { line: 8, options: ['    return n > 0 and (n & (n - 1)) == 0', '    return n & (n - 1) is 0', '    return n > 0 and n & n - 1 == 0'],
        explanation: '== binds tighter than &: n & ((n - 1) == 0). Also 0 is not a power of two — guard n > 0.' },
    ],
  }),
  b({
    id: 'bug-dice-sim', title: 'Dice Frequency Simulation', pattern: 'math', difficulty: 'easy',
    companies: ['janestreet', 'citadel', 'hrt'],
    prompt: 'Empirical distribution of a fair six-sided die.',
    code: `import random

def simulate_dice(trials, counts={}):
    counts = {} if counts is None else counts
    for _ in range(trials):
        roll = random.randint(1, 7)
        counts[roll] = counts.get(roll, 0) + 1
    return {k: v / trials for k, v in counts.items()}`,
    bugs: [
      { line: 3, options: ['def simulate_dice(trials, counts=None):', 'def simulate_dice(trials, counts=dict()):', 'def simulate_dice(trials, *counts):'],
        explanation: 'Mutable default: the same dict is reused across calls, so the second call\'s frequencies sum to 2.0. Default to None.' },
      { line: 6, options: ['        roll = random.randint(1, 6)', '        roll = random.randrange(1, 7, 2)', '        roll = random.randint(0, 6)'],
        explanation: 'randint is INCLUSIVE on both ends — (1, 7) produces 7s. (randrange(1, 7) would be the exclusive form.)' },
    ],
  }),
  b({
    id: 'bug-lru-dll', title: 'LRU Cache (doubly linked list)', pattern: 'ds-scratch', difficulty: 'hard',
    companies: ['amazon', 'meta', 'citadel', 'hrt', 'openai', 'microsoft', 'goldman', 'jpmorgan'],
    prompt: 'Hand-rolled LRU: dict + DLL with sentinels. Most recent at front.',
    code: `class Node:
    def __init__(self, k=0, v=0):
        self.k, self.v, self.prev, self.next = k, v, None, None

class LRUCache:
    def __init__(self, cap):
        self.cap, self.map = cap, {}
        self.head, self.tail = Node(), Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, n):
        n.prev.next, n.next.prev = n.next, n.prev

    def _add_front(self, n):
        n.next, n.prev = self.head.next, self.head
        self.head.next = n
        self.head.next.prev = n

    def put(self, k, v):
        if k in self.map:
            self._remove(self.map[k])
        n = Node(k, v)
        self.map[k] = n
        self._add_front(n)
        if len(self.map) > self.cap:
            lru = self.tail.prev
            self._remove(lru)`,
    bugs: [
      { line: 17, options: ['        n.next.prev = n', '        self.head.prev = n', '        n.prev.prev = n'],
        explanation: 'After line 16, self.head.next IS n, so this sets n.prev = n and the old first node still points back at head. Fix the old first node: n.next.prev = n.' },
      { line: 27, options: ['            self._remove(lru); del self.map[lru.k]', '            self._remove(self.head.next)', '            del self.map[lru]'],
        explanation: 'The evicted node stays in the dict → len(self.map) never drops and get() returns an evicted node.' },
    ],
  }),
  b({
    id: 'bug-ring-buffer', title: 'Ring Buffer', pattern: 'ds-scratch', difficulty: 'medium',
    companies: ['hrt', 'citadel', 'nvidia', 'janestreet'],
    prompt: 'Fixed-capacity FIFO queue backed by a list.',
    code: `class RingBuffer:
    def __init__(self, k):
        self.buf = [0] * k
        self.k = k
        self.head = self.count = 0

    def push(self, x):
        if self.count == self.k:
            raise OverflowError
        self.buf[self.head + self.count] = x
        self.count += 1

    def pop(self):
        if self.count == 0:
            raise IndexError
        x = self.buf[self.head]
        self.head += 1
        self.count -= 1
        return x`,
    bugs: [
      { line: 10, options: ['        self.buf[(self.head + self.count) % self.k] = x', '        self.buf[self.count] = x', '        self.buf.append(x)'],
        explanation: 'Without wrap-around, once head moves, head + count exceeds k − 1 → IndexError.' },
      { line: 17, options: ['        self.head = (self.head + 1) % self.k', '        self.head -= 1', '        self.head = self.count % self.k'],
        explanation: 'head grows past the buffer end → IndexError on the (k+1)-th pop.' },
    ],
  }),
];

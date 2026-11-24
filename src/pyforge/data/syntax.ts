import type { SyntaxExercise } from '../types';

type S = Omit<SyntaxExercise, 'kind'>;
const s = (x: S): SyntaxExercise => ({ kind: 'syntax', ...x });
const QUANT = ['citadel', 'hrt', 'janestreet'] as const;

export const SYNTAX: SyntaxExercise[] = [
  // ───────────── Arrays & Hashing ─────────────
  s({
    id: 'syn-two-sum', title: 'Two Sum (hash map)', pattern: 'arrays', difficulty: 'easy',
    companies: ['google', 'amazon', 'meta', 'apple', ...QUANT, 'goldman', 'jpmorgan'],
    prompt: 'Return indices of the two numbers that add to target in one pass.',
    code: `def two_sum(nums, target):
    seen = __0__
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        __1__
    return []`,
    blanks: [
      { answers: ['{}', 'dict()'], intent: 'empty dict mapping value → index' },
      { answers: ['seen[x] = i'], intent: 'record this value\'s index AFTER the check' },
    ],
  }),
  s({
    id: 'syn-group-anagrams', title: 'Group Anagrams (defaultdict)', pattern: 'arrays', difficulty: 'medium',
    companies: ['amazon', 'meta', 'microsoft', 'google', 'goldman', 'jpmorgan'],
    prompt: 'Group strings that are anagrams of each other.',
    code: `from collections import defaultdict

def group_anagrams(strs):
    groups = __0__
    for s in strs:
        key = __1__
        groups[key].append(s)
    return __2__`,
    blanks: [
      { answers: ['defaultdict(list)'], intent: 'dict whose missing keys start as []' },
      { answers: ['tuple(sorted(s))', "''.join(sorted(s))"], intent: 'hashable canonical key (lists are NOT hashable)' },
      { answers: ['list(groups.values())'], intent: 'convert dict values view to a list' },
    ],
  }),
  s({
    id: 'syn-subarray-sum-k', title: 'Subarray Sum = K (prefix sums)', pattern: 'arrays', difficulty: 'medium',
    companies: ['meta', 'google', 'citadel', 'openai'],
    prompt: 'Count contiguous subarrays summing to k (values may be negative).',
    code: `def subarray_sum(nums, k):
    count = {0: 1}          # prefix sum -> times seen
    total = res = 0
    for x in nums:
        total += x
        res += __0__
        count[total] = __1__
    return res`,
    blanks: [
      { answers: ['count.get(total - k, 0)'], intent: 'how many earlier prefixes equal total - k (default 0)' },
      { answers: ['count.get(total, 0) + 1'], intent: 'increment this prefix\'s count safely' },
    ],
  }),
  s({
    id: 'syn-top-k-counter', title: 'Top K Frequent (Counter)', pattern: 'arrays', difficulty: 'medium',
    companies: ['amazon', 'meta', 'netflix', 'nvidia', 'goldman', 'jpmorgan'],
    prompt: 'Return the k most frequent elements using the standard library.',
    code: `from collections import Counter

def top_k_frequent(nums, k):
    freq = __0__
    return [x for x, _ in __1__]`,
    blanks: [
      { answers: ['Counter(nums)'], intent: 'value → count mapping in one call' },
      { answers: ['freq.most_common(k)'], intent: 'list of (value, count) pairs, highest count first' },
    ],
  }),

  // ───────────── Two Pointers ─────────────
  s({
    id: 'syn-palindrome', title: 'Valid Palindrome', pattern: 'two-pointers', difficulty: 'easy',
    companies: ['meta', 'microsoft', 'apple', 'goldman', 'jpmorgan'],
    prompt: 'Converging pointers from both ends.',
    code: `def is_palindrome(s):
    l, r = __0__
    while __1__:
        if s[l] != s[r]:
            return __2__
        l += 1
        r -= 1
    return True`,
    blanks: [
      { answers: ['0, len(s) - 1'], intent: 'left at first index, right at LAST valid index' },
      { answers: ['l < r'], intent: 'stop when pointers meet' },
      { answers: ['False'], intent: 'boolean literal (capitalized!)' },
    ],
  }),
  s({
    id: 'syn-three-sum', title: '3Sum (sort + converge)', pattern: 'two-pointers', difficulty: 'medium',
    companies: ['meta', 'amazon', 'google', 'microsoft', 'goldman', 'jpmorgan'],
    prompt: 'All unique triplets summing to 0.',
    code: `def three_sum(nums):
    __0__
    res = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0:
                l += 1
            elif s > 0:
                r -= 1
            else:
                res.append(__1__)
                l += 1
                while l < r and nums[l] == nums[l - 1]:
                    l += 1
    return res`,
    blanks: [
      { answers: ['nums.sort()'], intent: 'sort IN PLACE (sorted() returns a new list you\'d discard)' },
      { answers: ['[nums[i], nums[l], nums[r]]'], intent: 'the triplet as a list' },
    ],
  }),
  s({
    id: 'syn-move-zeroes', title: 'Move Zeroes (partition)', pattern: 'two-pointers', difficulty: 'easy',
    companies: ['meta', 'apple', 'microsoft', 'goldman', 'jpmorgan'],
    prompt: 'Move zeros to the end in-place, keep relative order.',
    code: `def move_zeroes(nums):
    w = 0
    for r in range(len(nums)):
        if nums[r] != 0:
            __0__
            w += 1`,
    blanks: [
      { answers: ['nums[w], nums[r] = nums[r], nums[w]', 'nums[r], nums[w] = nums[w], nums[r]'], intent: 'swap in one line with tuple unpacking' },
    ],
  }),

  // ───────────── Sliding Window ─────────────
  s({
    id: 'syn-longest-substring', title: 'Longest Substring w/o Repeats', pattern: 'sliding-window', difficulty: 'medium',
    companies: ['amazon', 'meta', 'google', 'microsoft', 'apple', 'goldman', 'jpmorgan'],
    prompt: 'Dynamic window backed by a set.',
    code: `def length_of_longest(s):
    window = __0__
    l = best = 0
    for r, ch in enumerate(s):
        while ch in window:
            __1__
            l += 1
        window.add(ch)
        best = __2__
    return best`,
    blanks: [
      { answers: ['set()'], intent: 'EMPTY SET (not {} — that is a dict)' },
      { answers: ['window.remove(s[l])', 'window.discard(s[l])'], intent: 'evict the leftmost char from the set' },
      { answers: ['max(best, r - l + 1)'], intent: 'window length is inclusive: r - l + 1' },
    ],
  }),
  s({
    id: 'syn-fixed-window', title: 'Max Sum of Size-K Window', pattern: 'sliding-window', difficulty: 'easy',
    companies: ['amazon', 'nvidia', 'hrt', 'goldman', 'jpmorgan'],
    prompt: 'Fixed window, O(1) update per step.',
    code: `def max_sum_k(nums, k):
    cur = __0__
    best = cur
    for i in range(k, len(nums)):
        cur += __1__
        best = max(best, cur)
    return best`,
    blanks: [
      { answers: ['sum(nums[:k])'], intent: 'sum of the first k elements via slicing' },
      { answers: ['nums[i] - nums[i - k]'], intent: 'add entering element, subtract leaving one' },
    ],
  }),
  s({
    id: 'syn-char-replacement', title: 'Longest Repeating Char Replacement', pattern: 'sliding-window', difficulty: 'medium',
    companies: ['google', 'amazon', 'openai', 'goldman', 'jpmorgan'],
    prompt: 'Window valid while (len - maxfreq) <= k.',
    code: `from collections import defaultdict

def character_replacement(s, k):
    freq = defaultdict(int)
    l = maxf = best = 0
    for r, ch in enumerate(s):
        freq[ch] += 1
        maxf = max(maxf, freq[ch])
        if __0__ > k:
            __1__
            l += 1
        best = max(best, r - l + 1)
    return best`,
    blanks: [
      { answers: ['(r - l + 1) - maxf', 'r - l + 1 - maxf'], intent: 'chars that would need replacing' },
      { answers: ['freq[s[l]] -= 1'], intent: 'decrement count of the char leaving the window' },
    ],
  }),

  // ───────────── Stack ─────────────
  s({
    id: 'syn-valid-parens', title: 'Valid Parentheses', pattern: 'stack', difficulty: 'easy',
    companies: ['amazon', 'meta', 'google', 'microsoft', 'apple', 'netflix', 'goldman', 'jpmorgan'],
    prompt: 'Classic list-as-stack with a closing→opening map.',
    code: `def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or __0__ != pairs[ch]:
                return False
        else:
            __1__
    return __2__`,
    blanks: [
      { answers: ['stack.pop()'], intent: 'remove and return the top (last) element' },
      { answers: ['stack.append(ch)'], intent: 'push onto stack (lists use append, not push)' },
      { answers: ['not stack', 'len(stack) == 0'], intent: 'True only if every opener was matched' },
    ],
  }),
  s({
    id: 'syn-daily-temps', title: 'Daily Temperatures (monotonic)', pattern: 'stack', difficulty: 'medium',
    companies: ['meta', 'google', 'amazon', 'citadel', 'goldman', 'jpmorgan'],
    prompt: 'Monotonic decreasing stack of indices.',
    code: `def daily_temperatures(temps):
    res = __0__
    stack = []  # indices; temps strictly decreasing
    for i, t in enumerate(temps):
        while stack and __1__:
            j = stack.pop()
            res[j] = i - j
        stack.append(i)
    return res`,
    blanks: [
      { answers: ['[0] * len(temps)'], intent: 'list of zeros, one per day' },
      { answers: ['temps[stack[-1]] < t', 't > temps[stack[-1]]'], intent: 'top-of-stack day is colder than today' },
    ],
  }),
  s({
    id: 'syn-rpn', title: 'Evaluate Reverse Polish Notation', pattern: 'stack', difficulty: 'medium',
    companies: ['amazon', 'meta', 'janestreet', 'goldman', 'jpmorgan'],
    prompt: 'Integer division truncates toward zero.',
    code: `def eval_rpn(tokens):
    stack = []
    for t in tokens:
        if t in '+-*/':
            b, a = __0__
            if t == '+': stack.append(a + b)
            elif t == '-': stack.append(a - b)
            elif t == '*': stack.append(a * b)
            else: stack.append(__1__)
        else:
            stack.append(int(t))
    return stack[0]`,
    blanks: [
      { answers: ['stack.pop(), stack.pop()'], intent: 'pop right operand first, then left' },
      { answers: ['int(a / b)'], intent: 'truncate toward zero (// floors: -7 // 2 == -4)' },
    ],
  }),

  // ───────────── Binary Search ─────────────
  s({
    id: 'syn-binary-search', title: 'Classic Binary Search', pattern: 'binary-search', difficulty: 'easy',
    companies: ['google', 'microsoft', 'apple', 'nvidia', 'goldman', 'jpmorgan'],
    prompt: 'Closed interval [lo, hi].',
    code: `def search(nums, target):
    lo, hi = 0, __0__
    while lo <= hi:
        mid = __1__
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
    blanks: [
      { answers: ['len(nums) - 1'], intent: 'last valid index (closed interval)' },
      { answers: ['(lo + hi) // 2', 'lo + (hi - lo) // 2'], intent: 'integer midpoint — // not /' },
    ],
  }),
  s({
    id: 'syn-bisect-range', title: 'Count in Range (bisect)', pattern: 'binary-search', difficulty: 'easy',
    companies: [...QUANT, 'google'],
    prompt: 'Count x with lo <= x <= hi in a sorted list.',
    code: `import bisect

def count_in_range(arr, lo, hi):
    left = __0__
    right = __1__
    return right - left`,
    blanks: [
      { answers: ['bisect.bisect_left(arr, lo)'], intent: 'first index with arr[i] >= lo' },
      { answers: ['bisect.bisect_right(arr, hi)', 'bisect.bisect(arr, hi)'], intent: 'first index with arr[i] > hi' },
    ],
  }),
  s({
    id: 'syn-koko', title: 'Koko Eating Bananas (answer space)', pattern: 'binary-search', difficulty: 'medium',
    companies: ['google', 'amazon', 'meta', 'openai', 'goldman', 'jpmorgan'],
    prompt: 'Find the minimum speed that finishes within h hours.',
    code: `def min_eating_speed(piles, h):
    lo, hi = 1, __0__
    while lo < hi:
        mid = (lo + hi) // 2
        hours = sum(__1__ for p in piles)
        if hours <= h:
            hi = mid
        else:
            lo = __2__
    return lo`,
    blanks: [
      { answers: ['max(piles)'], intent: 'fastest speed ever needed' },
      { answers: ['(p + mid - 1) // mid', '-(-p // mid)', 'math.ceil(p / mid)'], intent: 'ceil(p / mid) with integers' },
      { answers: ['mid + 1'], intent: 'mid is too slow, exclude it' },
    ],
  }),

  // ───────────── Linked Lists ─────────────
  s({
    id: 'syn-reverse-list', title: 'Reverse Linked List', pattern: 'linked-list', difficulty: 'easy',
    companies: ['amazon', 'microsoft', 'apple', 'nvidia', 'meta', 'goldman', 'jpmorgan'],
    prompt: 'Iterative three-pointer reversal.',
    code: `def reverse_list(head):
    prev, cur = __0__
    while cur:
        nxt = cur.next
        __1__
        prev = cur
        cur = nxt
    return __2__`,
    blanks: [
      { answers: ['None, head'], intent: 'prev starts empty, cur at head' },
      { answers: ['cur.next = prev'], intent: 'flip the pointer' },
      { answers: ['prev'], intent: 'new head (cur is None now)' },
    ],
  }),
  s({
    id: 'syn-merge-lists', title: 'Merge Two Sorted Lists (dummy)', pattern: 'linked-list', difficulty: 'easy',
    companies: ['amazon', 'microsoft', 'apple', 'meta', 'goldman', 'jpmorgan'],
    prompt: 'Dummy head avoids special-casing the first node.',
    code: `def merge(l1, l2):
    dummy = tail = __0__
    while l1 and l2:
        if l1.val <= l2.val:
            tail.next, l1 = l1, l1.next
        else:
            tail.next, l2 = l2, l2.next
        tail = tail.next
    tail.next = __1__
    return __2__`,
    blanks: [
      { answers: ['ListNode()', 'ListNode(0)', 'ListNode(-1)'], intent: 'sentinel node' },
      { answers: ['l1 or l2'], intent: 'attach whichever list still has nodes' },
      { answers: ['dummy.next'], intent: 'skip the sentinel' },
    ],
  }),
  s({
    id: 'syn-has-cycle', title: 'Linked List Cycle (Floyd)', pattern: 'linked-list', difficulty: 'easy',
    companies: ['amazon', 'microsoft', 'nvidia', 'goldman', 'jpmorgan'],
    prompt: 'Fast/slow pointers, O(1) space.',
    code: `def has_cycle(head):
    slow = fast = head
    while __0__:
        slow = slow.next
        fast = __1__
        if slow is fast:
            return True
    return False`,
    blanks: [
      { answers: ['fast and fast.next'], intent: 'both must exist to jump two steps' },
      { answers: ['fast.next.next'], intent: 'advance two nodes' },
    ],
  }),

  // ───────────── Trees ─────────────
  s({
    id: 'syn-level-order', title: 'Binary Tree Level Order', pattern: 'trees', difficulty: 'medium',
    companies: ['meta', 'amazon', 'microsoft', 'google', 'apple', 'goldman', 'jpmorgan'],
    prompt: 'BFS with a deque, one level per outer loop.',
    code: `from collections import deque

def level_order(root):
    if not root:
        return []
    res, q = [], __0__
    while q:
        level = []
        for _ in range(__1__):
            node = __2__
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res`,
    blanks: [
      { answers: ['deque([root])'], intent: 'deque takes an ITERABLE — wrap root in a list' },
      { answers: ['len(q)'], intent: 'snapshot the level size before adding children' },
      { answers: ['q.popleft()'], intent: 'O(1) pop from the front (FIFO)' },
    ],
  }),
  s({
    id: 'syn-validate-bst', title: 'Validate BST (bounds)', pattern: 'trees', difficulty: 'medium',
    companies: ['meta', 'amazon', 'microsoft', 'google', 'goldman', 'jpmorgan'],
    prompt: 'Pass down an open interval (lo, hi).',
    code: `def is_valid_bst(root):
    def dfs(node, lo, hi):
        if not node:
            return __0__
        if not (lo < node.val < hi):
            return False
        return dfs(node.left, lo, __1__) and dfs(node.right, __2__, hi)
    return dfs(root, __3__, float('inf'))`,
    blanks: [
      { answers: ['True'], intent: 'empty subtree is valid' },
      { answers: ['node.val'], intent: 'left subtree must be < node' },
      { answers: ['node.val'], intent: 'right subtree must be > node' },
      { answers: ["float('-inf')", '-math.inf'], intent: 'negative infinity' },
    ],
  }),
  s({
    id: 'syn-lca', title: 'Lowest Common Ancestor', pattern: 'trees', difficulty: 'medium',
    companies: ['meta', 'google', 'amazon', 'microsoft', 'openai', 'goldman', 'jpmorgan'],
    prompt: 'Return the node where p and q split.',
    code: `def lca(root, p, q):
    if not root or root is p or root is q:
        return __0__
    left = lca(root.left, p, q)
    right = lca(root.right, p, q)
    if left and right:
        return __1__
    return __2__`,
    blanks: [
      { answers: ['root'], intent: 'found p/q (or hit None)' },
      { answers: ['root'], intent: 'p and q in different subtrees' },
      { answers: ['left or right'], intent: 'bubble up whichever side found something' },
    ],
  }),
  s({
    id: 'syn-max-depth', title: 'Max Depth (recursive)', pattern: 'trees', difficulty: 'easy',
    companies: ['amazon', 'apple', 'microsoft', 'netflix', 'goldman', 'jpmorgan'],
    prompt: 'One-liner recursion.',
    code: `def max_depth(root):
    if __0__:
        return 0
    return __1__`,
    blanks: [
      { answers: ['not root', 'root is None'], intent: 'base case: empty tree' },
      { answers: ['1 + max(max_depth(root.left), max_depth(root.right))'], intent: '1 + deeper child' },
    ],
  }),

  // ───────────── Tries ─────────────
  s({
    id: 'syn-trie', title: 'Trie with TrieNode class', pattern: 'tries', difficulty: 'medium',
    companies: ['google', 'amazon', 'microsoft', 'openai', 'goldman', 'jpmorgan'],
    prompt: 'Insert + startsWith.',
    code: `class TrieNode:
    def __init__(self):
        self.children = __0__
        self.end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                __1__
            node = node.children[ch]
        node.end = __2__

    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True`,
    blanks: [
      { answers: ['{}', 'dict()'], intent: 'char → TrieNode map' },
      { answers: ['node.children[ch] = TrieNode()'], intent: 'create the missing child' },
      { answers: ['True'], intent: 'mark end of word' },
    ],
  }),
  s({
    id: 'syn-dict-trie', title: 'Nested-dict Trie (setdefault)', pattern: 'tries', difficulty: 'easy',
    companies: ['google', 'meta', 'janestreet'],
    prompt: 'Compact trie with plain dicts; "$" marks word end.',
    code: `def build_trie(words):
    root = {}
    for w in words:
        node = root
        for ch in w:
            node = __0__
        node['$'] = True
    return root

def search(root, word):
    node = root
    for ch in word:
        if ch not in node:
            return False
        node = node[ch]
    return __1__`,
    blanks: [
      { answers: ['node.setdefault(ch, {})'], intent: 'get child dict, creating it if absent' },
      { answers: ["'$' in node"], intent: 'whole word, not just a prefix' },
    ],
  }),

  // ───────────── Heaps ─────────────
  s({
    id: 'syn-k-largest', title: 'K Largest (size-k min-heap)', pattern: 'heaps', difficulty: 'medium',
    companies: ['amazon', 'meta', 'google', 'nvidia', 'citadel', 'goldman', 'jpmorgan'],
    prompt: 'Keep the k biggest seen so far.',
    code: `import heapq

def k_largest(nums, k):
    heap = []
    for x in nums:
        __0__
        if len(heap) > k:
            __1__
    return heap[0]  # kth largest`,
    blanks: [
      { answers: ['heapq.heappush(heap, x)'], intent: 'module function; heap is the first arg' },
      { answers: ['heapq.heappop(heap)'], intent: 'drop the smallest of the k+1' },
    ],
  }),
  s({
    id: 'syn-last-stone', title: 'Last Stone Weight (max-heap)', pattern: 'heaps', difficulty: 'easy',
    companies: ['amazon', 'google', 'hrt', 'goldman', 'jpmorgan'],
    prompt: 'heapq is a min-heap; negate for max.',
    code: `import heapq

def last_stone_weight(stones):
    heap = __0__
    heapq.heapify(heap)
    while len(heap) > 1:
        a = __1__
        b = -heapq.heappop(heap)
        if a != b:
            heapq.heappush(heap, __2__)
    return -heap[0] if heap else 0`,
    blanks: [
      { answers: ['[-s for s in stones]'], intent: 'negated copy for max-heap behaviour' },
      { answers: ['-heapq.heappop(heap)'], intent: 'pop largest and un-negate' },
      { answers: ['b - a', '-(a - b)'], intent: 're-negate the leftover (a ≥ b)' },
    ],
  }),
  s({
    id: 'syn-merge-k', title: 'Merge K Sorted Arrays', pattern: 'heaps', difficulty: 'hard',
    companies: ['google', 'meta', 'amazon', 'hrt', 'citadel', 'goldman', 'jpmorgan'],
    prompt: 'Heap of (value, list index, element index) tuples.',
    code: `import heapq

def merge_k_sorted(lists):
    heap = [__0__ for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    out = []
    while heap:
        val, i, j = heapq.heappop(heap)
        out.append(val)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, __1__)
    return out`,
    blanks: [
      { answers: ['(lst[0], i, 0)'], intent: 'first element of each list' },
      { answers: ['(lists[i][j + 1], i, j + 1)'], intent: 'next element from the same list' },
    ],
  }),

  // ───────────── Backtracking ─────────────
  s({
    id: 'syn-subsets', title: 'Subsets (include / exclude)', pattern: 'backtracking', difficulty: 'medium',
    companies: ['meta', 'amazon', 'google', 'microsoft', 'goldman', 'jpmorgan'],
    prompt: 'Snapshot path at the leaf, undo after recursion.',
    code: `def subsets(nums):
    res, path = [], []
    def bt(i):
        if i == len(nums):
            res.append(__0__)
            return
        path.append(nums[i])
        bt(i + 1)
        __1__
        bt(i + 1)
    bt(0)
    return res`,
    blanks: [
      { answers: ['path[:]', 'list(path)', 'path.copy()'], intent: 'COPY — appending path itself aliases one list' },
      { answers: ['path.pop()'], intent: 'undo the choice before the exclude branch' },
    ],
  }),
  s({
    id: 'syn-permute', title: 'Permutations (used[])', pattern: 'backtracking', difficulty: 'medium',
    companies: ['meta', 'microsoft', 'apple', 'amazon', 'goldman', 'jpmorgan'],
    prompt: 'Track used indices.',
    code: `def permute(nums):
    res, path, used = [], [], [False] * len(nums)
    def bt():
        if __0__:
            res.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True
            path.append(nums[i])
            bt()
            __1__
            used[i] = __2__
    bt()
    return res`,
    blanks: [
      { answers: ['len(path) == len(nums)'], intent: 'full permutation built' },
      { answers: ['path.pop()'], intent: 'undo the append' },
      { answers: ['False'], intent: 'release index i' },
    ],
  }),
  s({
    id: 'syn-combination-sum', title: 'Combination Sum (prune)', pattern: 'backtracking', difficulty: 'medium',
    companies: ['amazon', 'meta', 'nvidia', 'goldman', 'jpmorgan'],
    prompt: 'Candidates may be reused; prune when over target.',
    code: `def combination_sum(cands, target):
    cands.sort()
    res, path = [], []
    def bt(start, remain):
        if remain == 0:
            res.append(path[:])
            return
        for i in range(start, len(cands)):
            if cands[i] > remain:
                __0__
            path.append(cands[i])
            bt(__1__, remain - cands[i])
            path.pop()
    bt(0, target)
    return res`,
    blanks: [
      { answers: ['break'], intent: 'sorted → every later candidate is also too big' },
      { answers: ['i'], intent: 'same index again = reuse allowed' },
    ],
  }),

  // ───────────── Graphs ─────────────
  s({
    id: 'syn-islands', title: 'Number of Islands (DFS + visited)', pattern: 'graphs', difficulty: 'medium',
    companies: ['amazon', 'meta', 'google', 'microsoft', 'apple', 'nvidia', 'goldman', 'jpmorgan'],
    prompt: '4-directional grid DFS with a visited set of tuples.',
    code: `def num_islands(grid):
    rows, cols = len(grid), len(grid[0])
    seen = set()
    dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    def dfs(r, c):
        if (r < 0 or c < 0 or r >= rows or c >= cols
                or grid[r][c] == '0' or __0__):
            return
        __1__
        for dr, dc in dirs:
            dfs(__2__)
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1' and (r, c) not in seen:
                dfs(r, c)
                count += 1
    return count`,
    blanks: [
      { answers: ['(r, c) in seen'], intent: 'already visited this cell' },
      { answers: ['seen.add((r, c))'], intent: 'mark visited — sets use .add, tuple needs its own parens' },
      { answers: ['r + dr, c + dc'], intent: 'neighbour coordinates' },
    ],
  }),
  s({
    id: 'syn-rotting', title: 'Rotting Oranges (multi-source BFS)', pattern: 'graphs', difficulty: 'medium',
    companies: ['amazon', 'meta', 'google', 'goldman', 'jpmorgan'],
    prompt: 'Seed the queue with every rotten orange.',
    code: `from collections import deque

def oranges_rotting(grid):
    R, C = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == 2:
                __0__
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while q and fresh:
        for _ in range(len(q)):
            r, c = q.popleft()
            for nr, nc in ((r+1, c), (r-1, c), (r, c+1), (r, c-1)):
                if __1__ and grid[nr][nc] == 1:
                    grid[nr][nc] = 2   # mark on PUSH
                    fresh -= 1
                    q.append((nr, nc))
        minutes += 1
    return minutes if fresh == 0 else -1`,
    blanks: [
      { answers: ['q.append((r, c))'], intent: 'enqueue a coordinate tuple' },
      { answers: ['0 <= nr < R and 0 <= nc < C'], intent: 'chained comparison bounds check' },
    ],
  }),

  // ───────────── Advanced Graphs ─────────────
  s({
    id: 'syn-kahn', title: "Topological Sort (Kahn's)", pattern: 'adv-graphs', difficulty: 'medium',
    companies: ['google', 'amazon', 'meta', 'openai', 'nvidia', 'goldman', 'jpmorgan'],
    prompt: 'Return an order, or [] if a cycle exists.',
    code: `from collections import deque, defaultdict

def topo_sort(n, edges):
    graph = defaultdict(list)
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        __0__
    q = deque(__1__)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if __2__:
                q.append(v)
    return order if len(order) == n else []`,
    blanks: [
      { answers: ['indeg[v] += 1'], intent: 'v has one more prerequisite' },
      { answers: ['i for i in range(n) if indeg[i] == 0', '[i for i in range(n) if indeg[i] == 0]'], intent: 'all nodes with no incoming edges' },
      { answers: ['indeg[v] == 0'], intent: 'all of v\'s prerequisites are done' },
    ],
  }),
  s({
    id: 'syn-dijkstra', title: "Dijkstra's Shortest Path", pattern: 'adv-graphs', difficulty: 'hard',
    companies: ['google', 'amazon', 'citadel', 'hrt', 'nvidia', 'goldman', 'jpmorgan'],
    prompt: 'Heap of (distance, node). Skip stale entries.',
    code: `import heapq

def dijkstra(graph, src):
    dist = {src: 0}
    heap = [__0__]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, float('inf')):
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                __1__
    return dist`,
    blanks: [
      { answers: ['(0, src)'], intent: 'distance FIRST so the heap orders by it' },
      { answers: ['heapq.heappush(heap, (nd, v))'], intent: 'push the improved (distance, node)' },
    ],
  }),
  s({
    id: 'syn-dsu', title: 'Union-Find (path compression + rank)', pattern: 'adv-graphs', difficulty: 'medium',
    companies: ['google', 'meta', ...QUANT],
    prompt: 'Near O(1) amortized find/union.',
    code: `class DSU:
    def __init__(self, n):
        self.parent = __0__
        self.rank = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = __1__
        return self.parent[x]

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return __2__
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True`,
    blanks: [
      { answers: ['list(range(n))'], intent: 'every node is its own parent' },
      { answers: ['self.find(self.parent[x])'], intent: 'path compression: point straight at root' },
      { answers: ['False'], intent: 'already connected (cycle detected)' },
    ],
  }),

  // ───────────── 1D DP ─────────────
  s({
    id: 'syn-climb', title: 'Climbing Stairs (@lru_cache)', pattern: 'dp-1d', difficulty: 'easy',
    companies: ['amazon', 'apple', 'microsoft', 'google', 'goldman', 'jpmorgan'],
    prompt: 'Top-down memoization.',
    code: `from functools import __0__

def climb(n):
    @lru_cache(maxsize=None)
    def f(i):
        if i <= 1:
            return 1
        return __1__
    return f(n)`,
    blanks: [
      { answers: ['lru_cache'], intent: 'decorator name from functools' },
      { answers: ['f(i - 1) + f(i - 2)'], intent: 'last step was 1 or 2' },
    ],
  }),
  s({
    id: 'syn-rob', title: 'House Robber (rolling vars)', pattern: 'dp-1d', difficulty: 'medium',
    companies: ['amazon', 'google', 'microsoft', 'citadel', 'goldman', 'jpmorgan'],
    prompt: 'O(1) space with simultaneous assignment.',
    code: `def rob(nums):
    prev2 = prev1 = 0
    for x in nums:
        prev2, prev1 = __0__
    return prev1`,
    blanks: [
      { answers: ['prev1, max(prev1, prev2 + x)'], intent: 'shift window: (skip x) vs (take x)' },
    ],
  }),
  s({
    id: 'syn-coin-change', title: 'Coin Change (bottom-up)', pattern: 'dp-1d', difficulty: 'medium',
    companies: ['amazon', 'google', 'meta', 'hrt', 'goldman', 'jpmorgan'],
    prompt: 'Min coins for each amount up to target.',
    code: `def coin_change(coins, amount):
    dp = __0__
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = __1__
    return dp[amount] if dp[amount] != float('inf') else -1`,
    blanks: [
      { answers: ["[float('inf')] * (amount + 1)"], intent: 'amount + 1 slots of infinity' },
      { answers: ['min(dp[a], dp[a - c] + 1)'], intent: 'use coin c as the last coin' },
    ],
  }),

  // ───────────── 2D DP ─────────────
  s({
    id: 'syn-unique-paths', title: 'Unique Paths (grid init)', pattern: 'dp-2d', difficulty: 'medium',
    companies: ['google', 'amazon', 'meta', 'apple', 'goldman', 'jpmorgan'],
    prompt: 'Build an m×n grid WITHOUT row aliasing.',
    code: `def unique_paths(m, n):
    dp = __0__
    for r in range(1, m):
        for c in range(1, n):
            dp[r][c] = __1__
    return dp[m - 1][n - 1]`,
    blanks: [
      { answers: ['[[1] * n for _ in range(m)]'], intent: 'm independent rows of 1s' },
      { answers: ['dp[r - 1][c] + dp[r][c - 1]'], intent: 'from above + from left' },
    ],
  }),
  s({
    id: 'syn-lcs', title: 'Longest Common Subsequence', pattern: 'dp-2d', difficulty: 'medium',
    companies: ['google', 'amazon', 'microsoft', 'openai', 'goldman', 'jpmorgan'],
    prompt: 'dp[i][j] = LCS of a[:i], b[:j].',
    code: `def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if __0__:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = __1__
    return dp[m][n]`,
    blanks: [
      { answers: ['a[i - 1] == b[j - 1]'], intent: 'dp is 1-indexed, strings are 0-indexed' },
      { answers: ['max(dp[i - 1][j], dp[i][j - 1])', 'max(dp[i][j - 1], dp[i - 1][j])'], intent: 'drop a char from either string' },
    ],
  }),
  s({
    id: 'syn-knapsack', title: '0/1 Knapsack (1D rolling)', pattern: 'dp-2d', difficulty: 'hard',
    companies: [...QUANT, 'amazon', 'goldman', 'jpmorgan'],
    prompt: 'Iterate capacity DOWNWARD so each item is used once.',
    code: `def knapsack(weights, values, cap):
    dp = [0] * (cap + 1)
    for w, v in zip(weights, values):
        for c in range(__0__):
            dp[c] = max(dp[c], __1__)
    return dp[cap]`,
    blanks: [
      { answers: ['cap, w - 1, -1'], intent: 'from cap down to w (inclusive)' },
      { answers: ['dp[c - w] + v'], intent: 'take the item' },
    ],
  }),

  // ───────────── Greedy & Intervals ─────────────
  s({
    id: 'syn-merge-intervals', title: 'Merge Intervals', pattern: 'greedy', difficulty: 'medium',
    companies: ['meta', 'google', 'amazon', 'microsoft', 'netflix', 'citadel', 'goldman', 'jpmorgan'],
    prompt: 'Sort by start, extend the last merged interval.',
    code: `def merge(intervals):
    __0__
    out = []
    for s, e in intervals:
        if out and s <= __1__:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out`,
    blanks: [
      { answers: ['intervals.sort()', 're:^intervals\\.sort\\(key=lambda(\\w+):\\1\\[0\\]\\)$'], intent: 'sort in place by start' },
      { answers: ['out[-1][1]'], intent: 'end of the last merged interval' },
    ],
  }),
  s({
    id: 'syn-erase-overlap', title: 'Non-overlapping Intervals', pattern: 'greedy', difficulty: 'medium',
    companies: ['google', 'meta', 'amazon', 'goldman', 'jpmorgan'],
    prompt: 'Greedy: keep the interval that ends first.',
    code: `def erase_overlap(intervals):
    intervals.sort(key=__0__)
    end, removed = float('-inf'), 0
    for s, e in intervals:
        if s >= end:
            end = e
        else:
            removed += 1
    return removed`,
    blanks: [
      { answers: ['re:^lambda(\\w+):\\1\\[1\\]$', 'itemgetter(1)'], intent: 'sort key = end time' },
    ],
  }),
  s({
    id: 'syn-meeting-rooms', title: 'Meeting Rooms II (heap of ends)', pattern: 'greedy', difficulty: 'medium',
    companies: ['meta', 'google', 'amazon', 'netflix', 'goldman', 'jpmorgan'],
    prompt: 'Min-heap of end times of rooms in use.',
    code: `import heapq

def min_rooms(intervals):
    intervals.sort()
    ends = []
    for s, e in intervals:
        if ends and __0__:
            heapq.heappop(ends)
        heapq.heappush(ends, e)
    return __1__`,
    blanks: [
      { answers: ['ends[0] <= s'], intent: 'earliest-ending room is free' },
      { answers: ['len(ends)'], intent: 'rooms in use' },
    ],
  }),

  // ───────────── Bits ─────────────
  s({
    id: 'syn-single-number', title: 'Single Number (XOR)', pattern: 'bits', difficulty: 'easy',
    companies: ['amazon', 'apple', 'nvidia', 'hrt', 'goldman', 'jpmorgan'],
    prompt: 'x ^ x == 0 and x ^ 0 == x.',
    code: `def single_number(nums):
    res = 0
    for x in nums:
        __0__
    return res`,
    blanks: [{ answers: ['res ^= x'], intent: 'XOR-accumulate' }],
  }),
  s({
    id: 'syn-popcount', title: 'Count Set Bits (Kernighan)', pattern: 'bits', difficulty: 'easy',
    companies: ['apple', 'nvidia', 'microsoft', 'hrt', 'goldman', 'jpmorgan'],
    prompt: 'Drop the lowest set bit each loop.',
    code: `def hamming_weight(n):
    count = 0
    while n:
        n = __0__
        count += 1
    return count`,
    blanks: [{ answers: ['n & (n - 1)'], intent: 'clear lowest set bit' }],
    note: 'Python 3.10+: n.bit_count() does this directly.',
  }),
  s({
    id: 'syn-mask-subsets', title: 'Subsets via Bitmask', pattern: 'bits', difficulty: 'medium',
    companies: ['janestreet', 'citadel', 'google'],
    prompt: 'Each mask in [0, 2^n) picks a subset.',
    code: `def subsets_mask(nums):
    n = len(nums)
    res = []
    for mask in range(__0__):
        res.append([nums[i] for i in range(n) if __1__])
    return res`,
    blanks: [
      { answers: ['1 << n', '2 ** n'], intent: '2^n masks' },
      { answers: ['mask & (1 << i)', '(mask >> i) & 1', 'mask >> i & 1'], intent: 'is bit i set?' },
    ],
  }),

  // ───────────── Math & Probability ─────────────
  s({
    id: 'syn-mod', title: 'Modular Arithmetic', pattern: 'math', difficulty: 'easy',
    companies: [...QUANT, 'google'],
    prompt: 'Keep numbers small; built-in 3-arg pow.',
    code: `MOD = 10**9 + 7

def fib_mod(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, __0__
    return a

def fast_pow(base, exp):
    return __1__`,
    blanks: [
      { answers: ['(a + b) % MOD'], intent: 'next fib, reduced mod MOD' },
      { answers: ['pow(base, exp, MOD)'], intent: 'modular exponentiation in O(log exp)' },
    ],
  }),
  s({
    id: 'syn-monte-carlo', title: 'Monte Carlo π', pattern: 'math', difficulty: 'easy',
    companies: ['janestreet', 'citadel', 'hrt', 'openai'],
    prompt: 'Fraction of random points inside the unit quarter circle.',
    code: `import random

def estimate_pi(trials=100_000):
    inside = 0
    for _ in range(trials):
        x, y = __0__, random.random()
        if __1__:
            inside += 1
    return __2__`,
    blanks: [
      { answers: ['random.random()'], intent: 'uniform float in [0, 1)' },
      { answers: ['x * x + y * y <= 1', 'x**2 + y**2 <= 1'], intent: 'inside the circle' },
      { answers: ['4 * inside / trials'], intent: 'area ratio × 4 (true division)' },
    ],
  }),
  s({
    id: 'syn-markov', title: 'Expected Flips until HH (simulation)', pattern: 'math', difficulty: 'medium',
    companies: ['janestreet', 'citadel', 'hrt'],
    prompt: 'State machine: state = current run of heads. Expected answer ≈ 6.',
    code: `import random

def flips_until_hh():
    state, flips = 0, 0
    while __0__:
        flips += 1
        if random.random() < 0.5:
            state += 1
        else:
            state = __1__
    return flips

def expected(trials=50_000):
    return __2__ / trials`,
    blanks: [
      { answers: ['state < 2', 'state != 2'], intent: 'keep flipping until two heads in a row' },
      { answers: ['0'], intent: 'tails resets the run' },
      { answers: ['sum(flips_until_hh() for _ in range(trials))'], intent: 'generator expression inside sum()' },
    ],
  }),

  // ───────────── DS From Scratch ─────────────
  s({
    id: 'syn-lru-od', title: 'LRU Cache (OrderedDict)', pattern: 'ds-scratch', difficulty: 'medium',
    companies: ['amazon', 'meta', 'microsoft', 'citadel', 'hrt', 'openai', 'nvidia', 'goldman', 'jpmorgan'],
    prompt: 'O(1) get/put, evict least recently used.',
    code: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.data = __0__

    def get(self, key):
        if key not in self.data:
            return -1
        __1__
        return self.data[key]

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.cap:
            __2__`,
    blanks: [
      { answers: ['OrderedDict()'], intent: 'insertion-ordered dict with move_to_end' },
      { answers: ['self.data.move_to_end(key)'], intent: 'mark as most recently used' },
      { answers: ['self.data.popitem(last=False)'], intent: 'evict from the FRONT (oldest)' },
    ],
  }),
  s({
    id: 'syn-ring', title: 'Ring Buffer (overwrite oldest)', pattern: 'ds-scratch', difficulty: 'medium',
    companies: ['hrt', 'citadel', 'nvidia', 'janestreet'],
    prompt: 'Fixed-size circular buffer; head is the oldest item.',
    code: `class RingBuffer:
    def __init__(self, k):
        self.buf = [None] * k
        self.k, self.head, self.size = k, 0, 0

    def push(self, x):
        tail = __0__
        self.buf[tail] = x
        if self.size == self.k:
            self.head = __1__
        else:
            self.size += 1

    def pop(self):
        x = self.buf[self.head]
        self.head = (self.head + 1) % self.k
        self.size -= 1
        return x`,
    blanks: [
      { answers: ['(self.head + self.size) % self.k'], intent: 'slot after the newest item, wrapped' },
      { answers: ['(self.head + 1) % self.k'], intent: 'full: oldest was overwritten, advance head' },
    ],
  }),
  s({
    id: 'syn-minheap', title: 'Min-Heap sift-up from scratch', pattern: 'ds-scratch', difficulty: 'medium',
    companies: ['hrt', 'nvidia', 'apple', 'citadel'],
    prompt: 'Array-backed binary heap.',
    code: `class MinHeap:
    def __init__(self):
        self.a = []

    def push(self, x):
        a = self.a
        a.append(x)
        i = len(a) - 1
        while i > 0:
            p = __0__
            if a[p] <= a[i]:
                break
            __1__
            i = p`,
    blanks: [
      { answers: ['(i - 1) // 2'], intent: 'parent index' },
      { answers: ['a[p], a[i] = a[i], a[p]', 'a[i], a[p] = a[p], a[i]'], intent: 'swap child up' },
    ],
  }),
  s({
    id: 'syn-orderbook', title: 'Limit Order Book (best bid/ask)', pattern: 'ds-scratch', difficulty: 'hard',
    companies: ['citadel', 'hrt', 'janestreet'],
    prompt: 'Bids max-heap (negated price), asks min-heap.',
    code: `import heapq

class OrderBook:
    def __init__(self):
        self.bids = []   # (-price, qty)
        self.asks = []   # (price, qty)

    def add(self, side, price, qty):
        if side == 'buy':
            heapq.heappush(self.bids, __0__)
        else:
            heapq.heappush(self.asks, (price, qty))

    def best_bid(self):
        return __1__ if self.bids else None

    def spread(self):
        if not self.bids or not self.asks:
            return None
        return self.asks[0][0] - self.best_bid()`,
    blanks: [
      { answers: ['(-price, qty)'], intent: 'negate so the highest bid sits at index 0' },
      { answers: ['-self.bids[0][0]'], intent: 'peek top bid price, un-negated' },
    ],
  }),
];

import type { PatternId } from '../types';
import { EXTRA_CHECKS } from './lessonChecks';

/**
 * Pattern lessons. The 15 patterns follow the widely shared "LeetCode was
 * HARD until I learned these 15 patterns" list (AlgoMaster), plus a
 * hashing foundation lesson because NeetCode 150 opens with it.
 * Each lesson links to NeetCode 150 problems by slug so solved ones tick.
 */
export interface Check {
  q: string;
  options: string[];
  answer: number;
  why: string;
  /** Why each wrong option is wrong, same index as options. */
  whyNot?: (string | null)[];
}

export interface Lesson {
  id: string;
  n: number;
  name: string;
  drill: PatternId;
  oneLiner: string;
  signals: string[];
  idea: string;
  analogy: string;
  example: { problem: string; steps: string[] };
  template: string;
  complexity: string;
  mistakes: string[];
  variants?: string[];
  problems: string[]; // NeetCode slugs, easiest first
  check: Check[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'hashing', n: 0, name: 'Hash maps and counting', drill: 'arrays',
    oneLiner: 'Trade memory for speed: remember what you have seen so each lookup is O(1).',
    signals: [
      '"Have I seen this before?" or "find the pair that adds to target"',
      'Count how often things appear (frequency, anagrams, duplicates)',
      'Group items that share a key (same letters, same remainder)',
      'The brute force is two nested loops comparing every pair',
    ],
    idea: 'A nested loop asks "does any earlier item match this one?" by scanning everything again. A dict or set answers that question instantly. So you walk the array once, and for each item you check the dict, then store the item. That turns O(N²) into O(N).',
    analogy: 'A coat check. Instead of searching every hook for your coat, you hand over a ticket number and get the coat straight away.',
    example: {
      problem: 'Two Sum: nums = [2, 7, 11, 15], target = 9. Return the indices of the two numbers that add to 9.',
      steps: [
        'Keep seen = {} mapping value to index.',
        'i = 0, x = 2. Need 9 − 2 = 7. Is 7 in seen? No. Store seen[2] = 0.',
        'i = 1, x = 7. Need 9 − 7 = 2. Is 2 in seen? Yes, at index 0. Answer [0, 1].',
        'We never looked at any element twice. One pass, O(N).',
      ],
    },
    template: `def two_sum(nums, target):
    seen = {}                      # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:     # O(1) lookup
            return [seen[target - x], i]
        seen[x] = i                # store AFTER checking (no self-pairing)

# Grouping: the key is what makes items "the same"
from collections import defaultdict
def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups[tuple(sorted(w))].append(w)   # or a 26-count tuple
    return list(groups.values())`,
    complexity: 'O(N) time, O(N) extra space.',
    mistakes: [
      'Storing before checking, so x pairs with itself (target 6, x = 3).',
      'Using a list as a dict key. Lists are not hashable, use tuple(...).',
      'Reaching for sorting (O(N log N)) when a set does it in O(N).',
    ],
    variants: ['Counter(nums).most_common(k)', 'Longest Consecutive Sequence: put all in a set, only start counting at numbers where n − 1 is not in the set'],
    problems: ['duplicate-integer', 'is-anagram', 'two-integer-sum', 'anagram-groups', 'top-k-elements-in-list', 'longest-consecutive-sequence'],
    check: [
      { q: 'Group Anagrams: what should the dict key be for the word "eat"?', options: ['"eat" itself', "tuple(sorted('eat')) which is ('a','e','t')", "sorted('eat') as a list", 'len("eat")'], answer: 1,
        why: 'Anagrams have the same letters, so sorting them gives the same result. The key must be hashable, so it has to be a tuple, not a list.',
        whyNot: ['Every word would be its own group because "eat" and "tea" are different strings.', null, 'Lists can\'t be dict keys. Python raises TypeError: unhashable type: list.', 'Different words with the same length ("cat", "dog") would wrongly group together.'] },
      { q: 'Contains Duplicate on 100,000 numbers. Fastest approach?', options: ['Compare every pair', 'Sort, then check neighbors', 'Add to a set, return True if already there', 'Binary search each number'], answer: 2,
        why: 'A set gives O(1) membership, so one pass is O(N). Sorting works but costs O(N log N).',
        whyNot: ['O(N²) is about 5 billion comparisons. Too slow.', 'Correct, but O(N log N). Fine as a backup if memory is tight.', null, 'Binary search needs sorted data and still does N searches.'] },
    ],
  },
  {
    id: 'prefix-sum', n: 1, name: 'Prefix sum', drill: 'arrays',
    oneLiner: 'Precompute running totals so any range sum is one subtraction.',
    signals: ['"Sum of subarray from i to j", asked many times', '"Count subarrays whose sum equals k" (especially with negatives)', '"Product of array except self" (a prefix and a suffix pass)'],
    idea: 'prefix[i] is the sum of everything before index i. The sum from i to j is prefix[j+1] − prefix[i]. To count subarrays summing to k, walk once keeping a running sum and ask: how many earlier prefixes equal running − k? A Counter answers that in O(1).',
    analogy: 'Your car\'s odometer. To know how far you drove between two towns, you subtract the two readings. You never re-drive the road.',
    example: {
      problem: 'Subarray Sum Equals K: nums = [1, 2, 3], k = 3. Count subarrays that sum to 3.',
      steps: [
        'count = {0: 1}  (the empty prefix, so a subarray starting at index 0 counts)',
        'x = 1, running = 1. running − k = −2, seen 0 times. count[1] = 1.',
        'x = 2, running = 3. running − k = 0, seen once, so answer += 1 (that is [1, 2]). count[3] = 1.',
        'x = 3, running = 6. running − k = 3, seen once, so answer += 1 (that is [3]). Total 2.',
      ],
    },
    template: `from collections import Counter
def subarray_sum(nums, k):
    count = Counter({0: 1})   # empty prefix
    running = ans = 0
    for x in nums:
        running += x
        ans += count[running - k]   # earlier prefixes that make a k-sum ending here
        count[running] += 1
    return ans

# Range sum queries
prefix = [0]
for x in nums: prefix.append(prefix[-1] + x)
range_sum = lambda i, j: prefix[j + 1] - prefix[i]`,
    complexity: 'O(N) to build, O(1) per query.',
    mistakes: ['Forgetting count[0] = 1, which misses subarrays that start at index 0.', 'Using a sliding window when numbers can be negative. The window can\'t tell when to shrink.', 'Off by one: the sum from i to j is prefix[j + 1] − prefix[i].'],
    variants: ['Product of Array Except Self: left products pass, then right products pass', '2D prefix sums for rectangle queries'],
    problems: ['products-of-array-discluding-self', 'maximum-subarray'],
    check: [
      { q: 'Count subarrays summing to k where nums contains negative numbers. Which pattern?', options: ['Sliding window', 'Prefix sum + Counter', 'Two pointers on sorted input', 'Binary search'], answer: 1,
        why: 'With negatives, growing a window can make the sum go down, so you can\'t decide when to shrink. Prefix sums don\'t care about signs.',
        whyNot: ['A window only works when growing it always pushes the sum one way (all positives).', null, 'Sorting destroys which elements are contiguous.', 'Nothing here is sorted or monotonic.'] },
    ],
  },
  {
    id: 'two-pointers', n: 2, name: 'Two pointers', drill: 'two-pointers',
    oneLiner: 'Two indices walk toward each other (or together) so you skip impossible pairs.',
    signals: ['Input is sorted, or sorting is allowed', '"Find a pair or triplet with sum X"', 'Palindrome checks, reversing in place', '"Remove duplicates in place" or "move zeros"'],
    idea: 'On a sorted array put l at the start and r at the end. If nums[l] + nums[r] is too small, the only way to grow it is l += 1. Too big, r −= 1. Every step throws away a whole row of pairs you never need to check, so N² pairs collapse to N steps.',
    analogy: 'Two people squeezing a tube of toothpaste from both ends, always moving the end that can make progress.',
    example: {
      problem: 'Two Sum II: sorted nums = [2, 7, 11, 15], target = 9.',
      steps: ['l = 0 (2), r = 3 (15). Sum 17 > 9, so r −= 1.', 'r = 2 (11). Sum 13 > 9, so r −= 1.', 'r = 1 (7). Sum 9. Found it.', 'Moving r left was safe: 15 is too big even with the smallest number, so 15 can\'t be in any answer.'],
    },
    template: `def pair_sum_sorted(nums, target):
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s == target: return [l, r]
        if s < target: l += 1
        else: r -= 1

def three_sum(nums):
    nums.sort(); res = []
    for i in range(len(nums) - 2):
        if i and nums[i] == nums[i - 1]: continue      # skip duplicate anchors
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0: l += 1
            elif s > 0: r -= 1
            else:
                res.append([nums[i], nums[l], nums[r]]); l += 1
                while l < r and nums[l] == nums[l - 1]: l += 1
    return res`,
    complexity: 'O(N) for a pair, O(N²) for 3Sum (plus O(N log N) sort).',
    mistakes: ['Using two pointers on unsorted data for a pair sum. Use a hash map there instead.', 'while l <= r when the two must be different elements.', 'Forgetting to skip duplicates in 3Sum, giving repeated triplets.'],
    variants: ['Container With Most Water: always move the shorter wall', 'Trapping Rain Water: track left max and right max'],
    problems: ['is-palindrome', 'two-integer-sum-ii', 'three-integer-sum', 'max-water-container', 'trapping-rain-water'],
    check: [
      { q: 'Container With Most Water: heights at l and r are 3 and 8. Which pointer moves?', options: ['r, because 8 is bigger', 'l, because 3 is the shorter wall', 'Both', 'Whichever gives more width'], answer: 1,
        why: 'Water is limited by the shorter wall. Moving the taller wall can only shrink width without raising the limit, so it never helps. Moving the shorter one is the only chance to do better.',
        whyNot: ['Keeping the 3 as the limit while width shrinks can only lose water.', null, 'You would skip pairs that might be the answer.', 'Width always shrinks by 1 whichever you move. The height limit is what matters.'] },
    ],
  },
  {
    id: 'sliding-window', n: 3, name: 'Sliding window', drill: 'sliding-window',
    oneLiner: 'Keep a contiguous window and update it as it slides instead of recomputing.',
    signals: ['"Longest or shortest substring or subarray that..."', 'The answer must be contiguous', 'A condition like "at most k distinct" or "no repeats" or "sum ≥ target" with positive numbers', '"Every window of size k"'],
    idea: 'Grow the window by moving right one step at a time. When the window breaks the rule, move left forward until it is valid again. Each index enters once and leaves once, so it is O(N), not O(N²).',
    analogy: 'A caterpillar crawling: the front stretches forward, and when it gets too long the back catches up.',
    example: {
      problem: 'Longest Substring Without Repeating Characters: s = "abcabcbb".',
      steps: ['Window "abc" (l = 0, r = 2), length 3.', 'r = 3 adds "a", which repeats. Move l past the old "a": l = 1, window "bca".', 'Keep going. The window never gets longer than 3.', 'Answer 3. Each character was added once and removed at most once.'],
    },
    template: `def longest_valid(s):
    freq = {}
    l = best = 0
    for r, ch in enumerate(s):
        freq[ch] = freq.get(ch, 0) + 1          # 1. expand
        while freq[ch] > 1:                      # 2. shrink while invalid
            freq[s[l]] -= 1
            l += 1
        best = max(best, r - l + 1)              # 3. record a valid window
    return best

# Fixed size k
def max_sum_k(nums, k):
    cur = sum(nums[:k]); best = cur
    for r in range(k, len(nums)):
        cur += nums[r] - nums[r - k]
        best = max(best, cur)
    return best`,
    complexity: 'O(N) time, O(alphabet) space.',
    mistakes: ['Using if instead of while to shrink. One step may not be enough.', 'Recording the answer before the window is valid again.', 'Using it with negative numbers and sum targets. Use prefix sums there.'],
    variants: ['Minimum Window Substring: shrink while valid to find the shortest', 'Sliding Window Maximum: keep a decreasing deque of indices'],
    problems: ['buy-and-sell-crypto', 'longest-substring-without-duplicates', 'longest-repeating-substring-with-replacement', 'permutation-string', 'minimum-window-with-characters', 'sliding-window-maximum'],
    check: [
      { q: 'Longest substring with at most 2 distinct letters. When do you move l?', options: ['Every step', 'While the window has more than 2 distinct letters', 'When r reaches the end', 'Only when a letter repeats'], answer: 1,
        why: 'l moves only to repair the window. Once there are 2 or fewer distinct letters again, stop shrinking and record the length.',
        whyNot: ['Then the window never grows and you only check length 1 windows.', null, 'Then you only check one window.', 'Repeats are fine here. The rule is about distinct count.'] },
    ],
  },
  {
    id: 'fast-slow', n: 4, name: 'Fast and slow pointers', drill: 'linked-list',
    oneLiner: 'One pointer moves 1 step, the other 2. They meet if there is a loop.',
    signals: ['Linked list cycle detection', 'Find the middle of a linked list in one pass', '"O(1) extra space" with a list or a sequence that can loop', 'Find the duplicate number (array as a linked list)'],
    idea: 'If there is a cycle the fast pointer laps the slow one, like a faster runner on a track. If there is no cycle, fast hits the end. When fast reaches the end, slow is at the middle because it went half as far.',
    analogy: 'Two runners on a circular track. The faster one will eventually catch the slower one from behind.',
    example: { problem: 'Find the middle of 1 → 2 → 3 → 4 → 5.', steps: ['slow = 1, fast = 1.', 'slow = 2, fast = 3.', 'slow = 3, fast = 5. fast.next is None, stop.', 'slow is at 3, the middle.'] },
    template: `def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            return True
    return False

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow`,
    complexity: 'O(N) time, O(1) space.',
    mistakes: ['Checking only fast.next. You need while fast and fast.next.', 'Comparing values (==) instead of nodes (is).', 'Using a visited set when the problem asks for O(1) space.'],
    variants: ['Find the cycle start: after meeting, reset one pointer to head and move both by 1', 'Happy Number: the sequence of digit-square sums is the "list"'],
    problems: ['linked-list-cycle-detection', 'reorder-linked-list', 'find-duplicate-integer', 'non-cyclical-number'],
    check: [
      { q: 'Detect a cycle in a linked list with O(1) extra space. Why not a visited set?', options: ['A set is slower', 'A set uses O(N) memory', 'Sets can\'t hold nodes', 'It would give the wrong answer'], answer: 1,
        why: 'The set works and is O(N) time, but it stores every node, which breaks the O(1) space requirement. Fast and slow uses two variables.',
        whyNot: ['Both are O(N) time.', null, 'Nodes are hashable by identity, so they can go in a set.', 'It would be correct, just too much memory.'] },
    ],
  },
  {
    id: 'reverse-ll', n: 5, name: 'Linked list in-place reversal', drill: 'linked-list',
    oneLiner: 'Flip next pointers one by one with prev, cur, nxt.',
    signals: ['"Reverse the list" or "reverse between positions m and n"', '"Reverse in groups of k"', 'Reorder or palindrome checks on a list'],
    idea: 'Walk the list. Before you move on, save cur.next, point cur back at prev, then shift prev and cur forward. A dummy node before head makes edge cases (reversing from the first node) disappear.',
    analogy: 'Turning around a line of people holding hands, one person at a time, so everyone now faces the other way.',
    example: { problem: 'Reverse 1 → 2 → 3.', steps: ['prev = None, cur = 1. Save nxt = 2. Point 1 → None. prev = 1, cur = 2.', 'Save nxt = 3. Point 2 → 1. prev = 2, cur = 3.', 'Save nxt = None. Point 3 → 2. prev = 3, cur = None.', 'Return prev, which is 3 → 2 → 1.'] },
    template: `def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next      # 1. save
        cur.next = prev     # 2. flip
        prev, cur = cur, nxt  # 3. advance
    return prev

def merge_two(a, b):
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val: tail.next, a = a, a.next
        else: tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next`,
    complexity: 'O(N) time, O(1) space.',
    mistakes: ['Losing the rest of the list because you flipped before saving next.', 'Returning head instead of prev.', 'Skipping the dummy node and then special-casing the head everywhere.'],
    problems: ['reverse-a-linked-list', 'merge-two-sorted-linked-lists', 'remove-node-from-end-of-linked-list', 'reorder-linked-list', 'reverse-nodes-in-k-group'],
    check: [
      { q: 'What goes wrong if you write cur.next = prev before saving cur.next?', options: ['Nothing', 'You lose the pointer to the rest of the list', 'It runs forever', 'It reverses twice'], answer: 1,
        why: 'cur.next was the only way to reach the remaining nodes. Overwrite it first and they are gone.',
        whyNot: ['The order matters here.', null, 'It stops early, it does not loop.', 'It never reaches the rest of the list.'] },
    ],
  },
  {
    id: 'monotonic-stack', n: 6, name: 'Monotonic stack', drill: 'stack',
    oneLiner: 'A stack kept in sorted order answers "next greater or smaller element" in O(N).',
    signals: ['"Next greater element", "next warmer day", "how many days until..."', '"Largest rectangle" or "how far can each bar extend"', 'Matching brackets or evaluating expressions (plain stack)'],
    idea: 'Keep indices of items still waiting for their answer. When a new item is bigger than the top, the top just found its "next greater", so pop it and record. Each item is pushed once and popped once, so O(N).',
    analogy: 'People in a queue waiting for someone taller to arrive. When a tall person shows up, everyone shorter in front of them gets their answer and leaves.',
    example: { problem: 'Daily Temperatures: [73, 74, 75, 71, 72].', steps: ['i = 0 (73). Push 0.', 'i = 1 (74 > 73). Pop 0, answer[0] = 1. Push 1.', 'i = 2 (75 > 74). Pop 1, answer[1] = 1. Push 2.', 'i = 3 (71). Push 3. i = 4 (72 > 71). Pop 3, answer[3] = 1. 75 still waits, so its answer stays 0.'] },
    template: `def next_greater_distance(temps):
    ans = [0] * len(temps)
    stack = []                         # indices, temps decreasing
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans

def valid_brackets(s):
    pair = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pair:
            if not stack or stack.pop() != pair[ch]: return False
        else: stack.append(ch)
    return not stack`,
    complexity: 'O(N) time, O(N) space.',
    mistakes: ['Pushing values when you need distances. Push indices.', 'Using if instead of while, so only one item gets resolved.', 'Mixing up increasing vs decreasing order. Ask: what makes the top "done"?'],
    problems: ['validate-parentheses', 'minimum-stack', 'evaluate-reverse-polish-notation', 'daily-temperatures', 'car-fleet', 'largest-rectangle-in-histogram'],
    check: [
      { q: 'For "next greater element", what does the stack hold?', options: ['Values that already have an answer', 'Indices still waiting for a bigger value, in decreasing order', 'Every index, sorted', 'Only the maximum'], answer: 1,
        why: 'Only unresolved items stay. They stay in decreasing order because anything smaller than the newcomer gets popped.',
        whyNot: ['Resolved items are popped and never needed again.', null, 'Sorting would cost O(N log N) and lose positions.', 'You need every waiting item, not just one.'] },
    ],
  },
  {
    id: 'top-k', n: 7, name: 'Top K elements (heap)', drill: 'heaps',
    oneLiner: 'Keep a heap of size k so you never sort everything.',
    signals: ['"k largest", "k smallest", "k most frequent", "k closest"', 'A stream of numbers with "current median" or "kth largest so far"', 'Repeatedly take the smallest or biggest item (scheduling, merging k lists)'],
    idea: 'Python heapq is a min-heap. For the k largest, keep a min-heap of size k: push each item, and if size goes over k, pop the smallest. What remains are the k largest. That is O(N log k) instead of O(N log N).',
    analogy: 'A leaderboard with k spots. A new score only gets in if it beats the lowest score on the board, which then drops off.',
    example: { problem: 'Kth largest in [3, 2, 1, 5, 6, 4] with k = 2.', steps: ['Push 3, 2 → heap [2, 3].', 'Push 1 → size 3, pop smallest (1). Heap [2, 3].', 'Push 5 → pop 2. Heap [3, 5]. Push 6 → pop 3. Heap [5, 6]. Push 4 → pop 4.', 'heap[0] = 5 is the 2nd largest.'] },
    template: `import heapq
def kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)       # drop the smallest
    return heap[0]

# Max-heap: push negatives.  Ties: push tuples (priority, index, item)
from collections import Counter
def top_k_frequent(nums, k):
    return [x for x, _ in Counter(nums).most_common(k)]`,
    complexity: 'O(N log k) time, O(k) space.',
    mistakes: ['Forgetting heapq is a min-heap. Negate for a max-heap.', 'Pushing objects that can\'t be compared. Add a tiebreak index in the tuple.', 'Sorting the whole array when only k items matter.'],
    variants: ['Median of a stream: a max-heap for the low half and a min-heap for the high half', 'Top K Frequent can also be bucket sort in O(N)'],
    problems: ['top-k-elements-in-list', 'kth-largest-integer-in-a-stream', 'last-stone-weight', 'k-closest-points-to-origin', 'kth-largest-element-in-an-array', 'task-scheduling', 'find-median-in-a-data-stream'],
    check: [
      { q: 'For the k largest numbers, which heap do you keep?', options: ['A max-heap of everything', 'A min-heap of size k', 'A max-heap of size k', 'No heap, sort'], answer: 1,
        why: 'The min-heap\'s top is the weakest of your current k, the one to kick out when something better arrives.',
        whyNot: ['Works, but O(N) memory and you don\'t need everything.', null, 'Its top is the biggest, which is the one you want to keep, so you\'d evict the wrong item.', 'O(N log N), slower than needed.'] },
    ],
  },
  {
    id: 'intervals', n: 8, name: 'Overlapping intervals', drill: 'greedy',
    oneLiner: 'Sort by start, then merge or count overlaps in one sweep.',
    signals: ['Input is a list of [start, end] pairs', '"Merge overlapping", "insert interval", "minimum rooms", "can attend all meetings"', '"Remove the fewest intervals so none overlap"'],
    idea: 'After sorting by start, an interval can only overlap the one you are currently building. If the next start is at or before the current end, extend the end. Otherwise close the current interval and start a new one.',
    analogy: 'Booking a calendar. Once meetings are in time order, you only need to compare each with the last one you scheduled.',
    example: { problem: 'Merge [[1,3], [8,10], [2,6]].', steps: ['Sort → [[1,3], [2,6], [8,10]].', '[2,6] starts at 2 ≤ 3, so merge to [1,6].', '[8,10] starts at 8 > 6, so start a new one.', 'Answer [[1,6], [8,10]].'] },
    template: `def merge(intervals):
    intervals.sort(key=lambda iv: iv[0])
    out = []
    for s, e in intervals:
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)   # extend
        else:
            out.append([s, e])                # new block
    return out

import heapq
def min_rooms(intervals):
    intervals.sort()
    ends = []                                 # end times of rooms in use
    for s, e in intervals:
        if ends and ends[0] <= s: heapq.heappop(ends)   # reuse a free room
        heapq.heappush(ends, e)
    return len(ends)`,
    complexity: 'O(N log N) for the sort, O(N) for the sweep.',
    mistakes: ['Forgetting to sort first.', 'Setting end = e instead of max(end, e). An interval can sit fully inside another.', 'Mixing up < and ≤ for touching intervals like [1,2] and [2,3]. Read the problem.'],
    variants: ['Non-overlapping Intervals: sort by END and greedily keep the earliest finishing'],
    problems: ['meeting-schedule', 'insert-new-interval', 'merge-intervals', 'non-overlapping-intervals', 'meeting-schedule-ii'],
    check: [
      { q: 'Merging [1,10] and then [2,3]. What is the merged end?', options: ['3', '10', '13', 'They don\'t overlap'], answer: 1,
        why: 'max(10, 3) = 10. [2,3] sits completely inside [1,10].',
        whyNot: ['That shrinks the interval. Always take the max of the two ends.', null, 'Ends are not added.', '2 ≤ 10, so they overlap.'] },
    ],
  },
  {
    id: 'binary-search', n: 9, name: 'Modified binary search', drill: 'binary-search',
    oneLiner: 'Halve the search space each step, on sorted data or on the answer itself.',
    signals: ['Sorted (or rotated sorted) input', 'O(log N) required', '"Minimum speed / capacity / time such that..." where bigger always works once something works', 'Find first or last position of something'],
    idea: 'Binary search works whenever a yes/no question flips exactly once: no, no, no, yes, yes. You look in the middle and throw away the half that can\'t hold the flip. That covers sorted arrays and also "search the answer": guess a speed, check if it works, and narrow down.',
    analogy: 'Guessing a number from 1 to 100 with "higher or lower". Seven guesses always suffice.',
    example: { problem: 'Koko Eating Bananas: piles = [3, 6, 7, 11], h = 8 hours. Slowest speed that finishes?', steps: ['Speeds range from 1 to 11 (the biggest pile).', 'Try 6: hours = 1 + 1 + 2 + 2 = 6 ≤ 8, so it works. Try slower: hi = 6.', 'Try 3: 1 + 2 + 3 + 4 = 10 > 8, too slow. lo = 4.', 'Try 4 (hours 8, works) → hi = 4. lo == hi, answer 4.'] },
    template: `def first_true(lo, hi, ok):
    """Smallest x in [lo, hi] with ok(x) True, given ok flips once."""
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid): hi = mid       # mid works, maybe something smaller does
        else: lo = mid + 1         # mid fails, go right
    return lo

import math
def min_eating_speed(piles, h):
    return first_true(1, max(piles),
        lambda k: sum(math.ceil(p / k) for p in piles) <= h)

from bisect import bisect_left
i = bisect_left(sorted_nums, target)   # first index with value >= target`,
    complexity: 'O(log N) checks, times the cost of each check.',
    mistakes: ['Infinite loops from lo = mid. With mid = (lo + hi) // 2 always use lo = mid + 1.', 'Not spotting "binary search on the answer" because the input isn\'t sorted.', 'Rotated array: decide which half is sorted first, then check if the target is inside it.'],
    problems: ['binary-search', 'search-2d-matrix', 'eating-bananas', 'find-minimum-in-rotated-sorted-array', 'find-target-in-rotated-sorted-array', 'time-based-key-value-store'],
    check: [
      { q: '"Minimum ship capacity to ship everything in D days." The weights aren\'t sorted. Can binary search apply?', options: ['No, input isn\'t sorted', 'Yes, on the capacity: if capacity C works, any bigger one works too', 'Only after sorting the weights', 'Only if D is small'], answer: 1,
        why: 'You search over possible answers, not the array. "Works or not" flips exactly once as capacity grows, which is all binary search needs.',
        whyNot: ['The sorted thing is the answer range, not the input.', null, 'Sorting would change the shipping order, which the problem fixes.', 'D doesn\'t matter.'] },
    ],
  },
  {
    id: 'tree-traversal', n: 10, name: 'Binary tree traversal', drill: 'trees',
    oneLiner: 'Solve it for one node assuming the children are already solved.',
    signals: ['Input is a binary tree or BST', '"Depth", "diameter", "balanced", "same tree", "path sum"', 'BST: "kth smallest", "validate" (inorder is sorted)'],
    idea: 'Write a function that returns the answer for a subtree. Trust it on node.left and node.right, then combine. Preorder = node, left, right. Inorder = left, node, right (sorted for a BST). Postorder = left, right, node (use it when the parent needs both children\'s answers, like height).',
    analogy: 'A manager asks each team lead for a report, then combines them. Nobody reads every employee\'s report personally.',
    example: { problem: 'Max depth of a tree with root 3, children 9 and 20, and 20 has children 15 and 7.', steps: ['depth(9) = 1 (no children).', 'depth(15) = depth(7) = 1, so depth(20) = 1 + max(1, 1) = 2.', 'depth(3) = 1 + max(1, 2) = 3.'] },
    template: `def max_depth(node):
    if not node: return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))

def diameter(root):
    best = 0
    def height(n):
        nonlocal best
        if not n: return 0
        l, r = height(n.left), height(n.right)
        best = max(best, l + r)       # path through n
        return 1 + max(l, r)          # what the parent needs
    height(root)
    return best

def inorder(n, out):
    if n: inorder(n.left, out); out.append(n.val); inorder(n.right, out)`,
    complexity: 'O(N) time, O(height) recursion stack.',
    mistakes: ['Forgetting the None base case.', 'Returning what the answer needs instead of what the parent needs (diameter vs height).', 'Validating a BST by checking only direct children. Pass down low and high bounds.'],
    problems: ['invert-a-binary-tree', 'depth-of-binary-tree', 'binary-tree-diameter', 'balanced-binary-tree', 'same-binary-tree', 'valid-binary-search-tree', 'kth-smallest-integer-in-bst', 'binary-tree-maximum-path-sum'],
    check: [
      { q: 'Kth smallest value in a BST. Which traversal?', options: ['Preorder', 'Inorder', 'Postorder', 'Level order'], answer: 1,
        why: 'Inorder visits a BST in sorted order, so the kth node visited is the answer.',
        whyNot: ['Visits the root first, not the smallest.', null, 'Visits children before parents, not sorted.', 'Goes by depth, not by value.'] },
    ],
  },
  {
    id: 'dfs', n: 11, name: 'Depth-first search (graphs)', drill: 'graphs',
    oneLiner: 'Go as deep as possible, mark visited, backtrack. Finds everything reachable.',
    signals: ['"Count connected components" or "clone the graph"', '"Can you finish all courses?" (cycle detection)', 'Edges given as pairs, or an adjacency list', 'Order dependencies → topological sort'],
    idea: 'Build an adjacency list. From a start node, visit a neighbor, then its neighbor, and so on, marking each node visited so you never loop. Every new unvisited start you need is a new component. For prerequisites, a node that you reach again while it is still on the current path means a cycle.',
    analogy: 'Exploring a maze by always taking the next unexplored corridor and chalking every room you\'ve been in.',
    example: { problem: 'Number of connected components: n = 5, edges [[0,1], [1,2], [3,4]].', steps: ['Adjacency: 0–1, 1–2, 3–4.', 'Start at 0: visit 0, 1, 2. Components = 1.', '1 and 2 are visited. Start at 3: visit 3, 4. Components = 2.', 'All visited. Answer 2.'] },
    template: `from collections import defaultdict
def count_components(n, edges):
    g = defaultdict(list)
    for a, b in edges: g[a].append(b); g[b].append(a)
    seen = set()
    def dfs(u):
        seen.add(u)
        for v in g[u]:
            if v not in seen: dfs(v)
    comps = 0
    for u in range(n):
        if u not in seen: dfs(u); comps += 1
    return comps

# Course schedule: 0 = unvisited, 1 = on current path, 2 = done
def can_finish(n, prereqs):
    g = defaultdict(list)
    for a, b in prereqs: g[b].append(a)
    state = [0] * n
    def dfs(u):
        if state[u] == 1: return False      # back on the path → cycle
        if state[u] == 2: return True
        state[u] = 1
        if not all(dfs(v) for v in g[u]): return False
        state[u] = 2; return True
    return all(dfs(u) for u in range(n))`,
    complexity: 'O(V + E) time and space.',
    mistakes: ['Marking visited too late, so nodes get added twice.', 'Directed vs undirected: add both directions only for undirected edges.', 'Deep recursion on big inputs. Use an explicit stack or sys.setrecursionlimit.'],
    variants: ['Union-Find for components and redundant edges', 'Kahn\'s BFS topological sort'],
    problems: ['clone-graph', 'course-schedule', 'course-schedule-ii', 'valid-tree', 'count-connected-components', 'redundant-connection'],
    check: [
      { q: 'Course Schedule: when does DFS prove there is a cycle?', options: ['When it reaches a visited node at all', 'When it reaches a node that is still on the current path', 'When a node has no neighbors', 'When it finishes'], answer: 1,
        why: 'A finished node reached again is just a shared prerequisite. Only a node still "in progress" means you went in a loop.',
        whyNot: ['Two courses can share a prerequisite with no cycle at all.', null, 'That is a course with nothing after it. Totally fine.', 'Finishing means no cycle was found.'] },
    ],
  },
  {
    id: 'bfs', n: 12, name: 'Breadth-first search', drill: 'graphs',
    oneLiner: 'Explore level by level with a queue. First time you reach something is the shortest path.',
    signals: ['"Shortest path" or "minimum steps" with equal-cost moves', '"Level order", "right side view", "nearest"', 'Spreading over time: rotting oranges, fire, infection'],
    idea: 'Put the start in a deque. Pop from the left, push unvisited neighbors to the right. Everything at distance 1 comes out before anything at distance 2, so the first time you see a node you have its shortest distance. Multi-source BFS starts with all sources in the queue at once.',
    analogy: 'Ripples spreading out from a stone dropped in water, one ring at a time.',
    example: { problem: 'Rotting Oranges: every minute, rotten oranges rot their 4 neighbors.', steps: ['Put every rotten orange in the queue at minute 0 (multi-source).', 'Process the whole queue level: each rots its fresh neighbors and adds them.', 'Each level is one minute.', 'If fresh oranges remain at the end, return −1.'] },
    template: `from collections import deque
def shortest_steps(start, target, neighbors):
    q = deque([(start, 0)])
    seen = {start}
    while q:
        node, d = q.popleft()
        if node == target: return d
        for nxt in neighbors(node):
            if nxt not in seen:
                seen.add(nxt)              # mark when ENQUEUED
                q.append((nxt, d + 1))
    return -1

def level_order(root):
    out, q = [], deque([root] if root else [])
    while q:
        out.append([n.val for n in q])
        for _ in range(len(q)):
            n = q.popleft()
            q.extend(c for c in (n.left, n.right) if c)
    return out`,
    complexity: 'O(V + E) time and space.',
    mistakes: ['Using list.pop(0), which is O(N). Use deque.popleft().', 'Marking visited when popped instead of when pushed, so nodes enter the queue many times.', 'Using BFS when edges have different weights. That needs Dijkstra (heap).'],
    variants: ['Dijkstra: BFS with a heap for weighted edges', 'Word Ladder: neighbors are one-letter changes'],
    problems: ['level-order-traversal-of-binary-tree', 'binary-tree-right-side-view', 'rotting-fruit', 'islands-and-treasure', 'word-ladder', 'network-delay-time'],
    check: [
      { q: 'Minimum moves in a grid where every move costs 1. DFS or BFS?', options: ['DFS', 'BFS', 'Either gives shortest', 'Binary search'], answer: 1,
        why: 'BFS reaches cells in order of distance, so the first arrival is the shortest. DFS might wander a long path first.',
        whyNot: ['DFS finds a path, not necessarily the shortest.', null, 'Only BFS guarantees shortest with equal costs.', 'Nothing here is monotonic to search over.'] },
    ],
  },
  {
    id: 'matrix', n: 13, name: 'Matrix (grid) traversal', drill: 'graphs',
    oneLiner: 'A grid is a graph: each cell links to its 4 neighbors.',
    signals: ['2D grid of 0/1, land/water, letters', '"Number of islands", "flood fill", "surrounded regions"', 'Rotate, spiral or set zeroes (index juggling)'],
    idea: 'Treat each cell as a node and up, down, left, right as edges. Check bounds before stepping. DFS or BFS from each unvisited land cell counts islands. You can mark visited by changing the grid value, which saves a set.',
    analogy: 'Spilling paint on one square of graph paper and watching it fill every connected square of the same color.',
    example: { problem: 'Number of Islands on a small grid.', steps: ['Scan cells row by row.', 'Hit a "1": islands += 1, then DFS sinks every connected "1" to "0".', 'Keep scanning. Sunk cells won\'t be counted again.', 'The count when the scan ends is the answer.'] },
    template: `def num_islands(grid):
    R, C = len(grid), len(grid[0])
    def sink(r, c):
        if not (0 <= r < R and 0 <= c < C) or grid[r][c] != '1':
            return
        grid[r][c] = '0'                       # mark visited
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sink(r + dr, c + dc)
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == '1':
                count += 1; sink(r, c)
    return count`,
    complexity: 'O(R × C) time.',
    mistakes: ['Checking bounds after indexing, causing IndexError (or a silent wrap with −1).', 'Mixing up rows and columns: grid[r][c], R = len(grid).', 'Pacific Atlantic: search backwards from the oceans instead of from every cell.'],
    problems: ['count-number-of-islands', 'max-area-of-island', 'pacific-atlantic-water-flow', 'surrounded-regions', 'rotate-matrix', 'spiral-matrix', 'set-zeroes-in-matrix'],
    check: [
      { q: 'Why does index −1 cause a silent bug in Python grids?', options: ['It raises an error', 'grid[-1] is the last row, so you wrap around instead of failing', 'It returns None', 'It is fine'], answer: 1,
        why: 'Python negative indexing wraps to the end. Without a bounds check, a cell on the top edge looks connected to the bottom row.',
        whyNot: ['That would be easier to catch. It doesn\'t raise.', null, 'It returns a real row.', 'It quietly gives wrong answers.'] },
    ],
  },
  {
    id: 'backtracking', n: 14, name: 'Backtracking', drill: 'backtracking',
    oneLiner: 'Choose, explore, un-choose. Builds every valid combination.',
    signals: ['"All subsets", "all permutations", "all combinations"', '"Generate every valid..." (parentheses, N-Queens, word search)', 'Small N (around 20 or less) because output is exponential'],
    idea: 'Picture a decision tree: at each step you choose an option. Add the choice to path, recurse, then pop it to try the next option. Prune branches that can\'t work (sum already too big) to save time.',
    analogy: 'Trying keys on a keyring. Try one, if it doesn\'t open the door take it out and try the next.',
    example: { problem: 'Subsets of [1, 2].', steps: ['Start path []. Record [].', 'Choose 1 → [1]. Record. Choose 2 → [1,2]. Record. Pop 2, pop 1.', 'Choose 2 → [2]. Record. Pop.', 'All: [], [1], [1,2], [2].'] },
    template: `def subsets(nums):
    res, path = [], []
    def bt(start):
        res.append(path[:])            # copy! path keeps changing
        for i in range(start, len(nums)):
            path.append(nums[i])       # choose
            bt(i + 1)                  # explore
            path.pop()                 # un-choose
    bt(0)
    return res

def permutations(nums):
    res, path, used = [], [], [False] * len(nums)
    def bt():
        if len(path) == len(nums): res.append(path[:]); return
        for i, x in enumerate(nums):
            if used[i]: continue
            used[i] = True; path.append(x)
            bt()
            path.pop(); used[i] = False
    bt()
    return res`,
    complexity: 'Exponential: O(2^N) subsets, O(N!) permutations.',
    mistakes: ['res.append(path) without copying. Every entry ends up as the same empty list.', 'Forgetting to pop, so choices leak into other branches.', 'Duplicates: sort first and skip nums[i] == nums[i-1] at the same level.'],
    problems: ['subsets', 'combination-target-sum', 'permutations', 'subsets-ii', 'combination-target-sum-ii', 'generate-parentheses', 'search-for-word', 'n-queens'],
    check: [
      { q: 'Your subsets code returns [[], [], [], []]. Most likely bug?', options: ['Wrong loop range', 'Appending path instead of path[:]', 'Missing base case', 'Using a set'], answer: 1,
        why: 'res.append(path) stores the same list object 4 times. By the end path is empty again, so all 4 look empty. Store a copy.',
        whyNot: ['That gives wrong subsets, not identical empty ones.', null, 'Subsets records every node, there is no special base case.', 'There is no set here.'] },
    ],
  },
  {
    id: 'dp', n: 15, name: 'Dynamic programming', drill: 'dp-1d',
    oneLiner: 'Write the answer in terms of smaller answers, then never compute one twice.',
    signals: ['"Number of ways", "minimum cost", "maximum value", "is it possible"', 'Choices at each step where earlier choices affect later ones', 'Brute force recursion repeats the same subproblems', 'Two strings compared character by character (2D DP)'],
    idea: 'Step 1: define dp[i] in words ("the best I can do using the first i houses"). Step 2: write the recurrence by looking at the last decision (rob house i or skip it). Step 3: base cases. Step 4: compute in order or use @lru_cache. If you can write it recursively, caching makes it DP.',
    analogy: 'Climbing stairs and writing on each step how many ways there are to reach it. The next step just adds the two notes behind you.',
    example: { problem: 'House Robber: [2, 7, 9, 3, 1]. No two adjacent houses.', steps: ['dp[i] = best using houses 0..i = max(skip: dp[i-1], rob: dp[i-2] + nums[i]).', 'dp = 2, 7, max(7, 2+9) = 11, max(11, 7+3) = 11, max(11, 11+1) = 12.', 'Answer 12 (houses 2, 9, 1).', 'Only the last two values are needed, so two variables are enough.'] },
    template: `from functools import lru_cache
def rob(nums):
    prev2 = prev1 = 0               # dp[i-2], dp[i-1]
    for x in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1

def coin_change(coins, amount):
    INF = float('inf')
    dp = [0] + [INF] * amount       # dp[a] = fewest coins for a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a: dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != INF else -1

def lcs(a, b):                       # 2D: prefixes of two strings
    @lru_cache(None)
    def f(i, j):
        if i == len(a) or j == len(b): return 0
        if a[i] == b[j]: return 1 + f(i + 1, j + 1)
        return max(f(i + 1, j), f(i, j + 1))
    return f(0, 0)`,
    complexity: 'Number of states × work per state. House Robber O(N), Coin Change O(amount × coins), LCS O(N × M).',
    mistakes: ['Jumping to a table before saying what dp[i] means in words.', 'Wrong base case (dp[0] for coin change is 0, not infinity).', 'Greedy instead of DP: coins [1, 3, 4] for amount 6, greedy picks 4+1+1 but 3+3 is better.'],
    problems: ['climbing-stairs', 'min-cost-climbing-stairs', 'house-robber', 'house-robber-ii', 'coin-change', 'word-break', 'longest-increasing-subsequence', 'count-paths', 'longest-common-subsequence', 'edit-distance'],
    check: [
      { q: 'Coins [1, 3, 4], amount 6. Why not greedy (always take the biggest coin)?', options: ['Greedy is too slow', 'Greedy gives 4+1+1 = 3 coins but 3+3 = 2 coins is better', 'Greedy can\'t handle 1', 'It works fine'], answer: 1,
        why: 'Taking the biggest coin first can paint you into a corner. DP tries every last coin for every amount, so it can\'t be fooled.',
        whyNot: ['Greedy is fast. It\'s just wrong here.', null, '1 isn\'t the problem.', 'Count the coins: greedy uses 3, the best is 2.'] },
    ],
  },
];

for (const l of LESSONS) l.check.push(...(EXTRA_CHECKS[l.id] ?? []));

export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l])) as Record<string, Lesson>;

/** Best lesson for a drill pattern id (first lesson that drills it). */
export const LESSON_FOR_PATTERN: Partial<Record<PatternId, string>> = {
  arrays: 'hashing', 'two-pointers': 'two-pointers', 'sliding-window': 'sliding-window', stack: 'monotonic-stack',
  'binary-search': 'binary-search', 'linked-list': 'reverse-ll', trees: 'tree-traversal', heaps: 'top-k',
  backtracking: 'backtracking', graphs: 'bfs', 'adv-graphs': 'dfs', 'dp-1d': 'dp', 'dp-2d': 'dp', greedy: 'intervals',
};

/** "This pattern fits when..." used to explain why a wrong pick doesn't fit. */
export const FITS_WHEN: Record<PatternId, string> = {
  arrays: 'you need O(1) lookups to count, group or find a matching partner in one pass',
  'two-pointers': 'the data is sorted (or can be) and two ends can move toward each other, or you modify in place',
  'sliding-window': 'the answer is a contiguous range and growing the window only makes the condition worse, so shrinking repairs it',
  stack: 'each item waits for the next bigger or smaller one, or things must match in last-in first-out order like brackets',
  'binary-search': 'something is sorted or a yes/no check flips exactly once as a value grows, and O(log N) is expected',
  'linked-list': 'you rewire next pointers, need O(1) space on a list, or detect cycles with fast and slow pointers',
  trees: 'the input is a tree and the answer for a node comes from the answers of its children',
  tries: 'you search many words by prefix at once',
  heaps: 'you repeatedly need the current smallest or largest, or only the top k matter',
  backtracking: 'you must list every valid combination, permutation or arrangement, and N is small',
  graphs: 'things connect to each other (edges, grid cells) and you explore reachability, components or shortest steps',
  'adv-graphs': 'you need ordering with dependencies, weighted shortest paths, or merging groups (Union-Find)',
  'dp-1d': 'the answer builds from smaller answers along one sequence and brute force would repeat subproblems',
  'dp-2d': 'two indices define a subproblem, usually two strings or a grid',
  greedy: 'a locally best choice is provably safe, often after sorting intervals by start or end',
  bits: 'you work with binary representations, XOR cancelling, or masks',
  math: 'there is a formula, modular arithmetic, or a simulation does the job',
  'ds-scratch': 'the task is to build a structure like an LRU cache with specific O(1) operations',
};

export const DS_FITS: Record<string, string> = {
  'dict / Counter': 'counting or mapping a key to something with O(1) lookup',
  set: 'only "have I seen this?" with O(1) membership',
  'two indices (l, r)': 'two positions that move, with no extra memory',
  deque: 'adding and removing at both ends in O(1), like BFS queues or monotonic windows',
  heapq: 'getting the smallest (or negated largest) repeatedly in O(log N)',
  'list as stack': 'last-in first-out with append and pop',
  'bisect on sorted list': 'finding insertion points in a sorted list in O(log N)',
  'lo / hi bounds': 'binary searching a range of indices or possible answers',
  'Union-Find': 'merging groups and asking "same group?" almost in O(1)',
  'Trie (nested dict)': 'prefix lookups over many words',
  'DP table / @lru_cache': 'storing answers to subproblems so each is computed once',
  'OrderedDict / DLL + dict': 'O(1) lookup plus O(1) move-to-front, like an LRU cache',
  'int bitmask / XOR': 'packing booleans into an int or cancelling pairs with XOR',
  'random + counters loop': 'Monte Carlo simulation',
};

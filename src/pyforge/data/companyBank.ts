import type { CompanyId } from '../types';

/**
 * Company question banks built from public candidate reports (Glassdoor,
 * LeetCode Discuss, Taro, Interview Query, Exponent, igotanoffer, PracHub,
 * company career pages). "Reported" means candidates said it came up, not
 * that the company publishes a list. Loops vary by team: confirm with your recruiter.
 */
export interface CodingQ { name: string; nc?: string; url?: string; why: string }
export interface BehavioralQ { q: string; tests: string; reported?: boolean }
export interface Bank {
  id: CompanyId;
  shape: string; // what the loop has looked like in recent reports
  coding: CodingQ[];
  build?: CodingQ[]; // practical / implementation / systems questions
  behavioral: BehavioralQ[];
  sources: { label: string; url: string }[];
}

const lc = (slug: string) => `https://leetcode.com/problems/${slug}/`;

export const BANKS: Bank[] = [
  {
    id: 'meta',
    shape: 'New grad reports usually describe 2 coding rounds (two problems in about 45 minutes, often Meta-tagged LeetCode mediums) and 1 behavioral round with a project deep dive. Many loops now include an AI-enabled coding round.',
    coding: [
      { name: 'Valid Palindrome', nc: 'is-palindrome', why: 'Warm-up for Valid Palindrome II, a Meta favorite' },
      { name: 'Valid Palindrome II', url: lc('valid-palindrome-ii'), why: 'Two pointers with one allowed deletion' },
      { name: 'Minimum Remove to Make Valid Parentheses', url: lc('minimum-remove-to-make-valid-parentheses'), why: 'Stack of indices, one of the most Meta-tagged problems' },
      { name: 'Subarray Sum Equals K', url: lc('subarray-sum-equals-k'), why: 'Prefix sums + hash map' },
      { name: 'Binary Tree Right Side View', nc: 'binary-tree-right-side-view', why: 'BFS by level' },
      { name: 'Lowest Common Ancestor of a Binary Tree', url: lc('lowest-common-ancestor-of-a-binary-tree'), why: 'Classic recursive tree question' },
      { name: 'Binary Tree Vertical Order Traversal', url: lc('binary-tree-vertical-order-traversal'), why: 'BFS with column index' },
      { name: 'Kth Largest Element In An Array', nc: 'kth-largest-element-in-an-array', why: 'Heap or quickselect' },
      { name: 'Merge Intervals', nc: 'merge-intervals', why: 'Sort + sweep' },
      { name: 'Random Pick with Weight', url: lc('random-pick-with-weight'), why: 'Prefix sums + binary search' },
      { name: 'Dot Product of Two Sparse Vectors', url: lc('dot-product-of-two-sparse-vectors'), why: 'Hash map design, common follow-ups' },
      { name: 'Clone Graph', nc: 'clone-graph', why: 'Graph traversal with a visited map' },
    ],
    behavioral: [
      { q: 'Give an example of a time you had to work with a difficult coworker.', tests: 'Conflict resolution, empathy, outcome', reported: true },
      { q: 'Tell me about a time you acted on feedback from your supervisor.', tests: 'Growth, coachability', reported: true },
      { q: 'Walk me through a project. Why did you choose that technology?', tests: 'Ownership and technical judgment in a deep dive', reported: true },
      { q: 'Tell me about a time you had to make progress with an unclear goal.', tests: 'Handling ambiguity' },
      { q: 'What is the most impactful thing you have built?', tests: 'Impact, measured with a number' },
    ],
    sources: [
      { label: 'Glassdoor: Meta New Grad SWE interviews', url: 'https://www.glassdoor.com/Interview/Meta-New-Grad-Software-Engineer-Interview-Questions-EI_IE40772.0,4_KO5,31.htm' },
      { label: 'interviewing.io: Meta process and AI-assisted round', url: 'https://interviewing.io/meta-interview-questions' },
    ],
  },
  {
    id: 'amazon',
    shape: 'Online assessment, then about three 45-minute rounds that each mix Leadership Principle questions with coding. Interviewers are each assigned 2–3 principles; the behavioral part is a common reason candidates fail.',
    coding: [
      { name: 'Two Sum', nc: 'two-integer-sum', why: 'Hash map basics' },
      { name: 'Number of Islands', nc: 'count-number-of-islands', why: 'Grid DFS/BFS, very frequently reported' },
      { name: 'Rotting Oranges', nc: 'rotting-fruit', why: 'Multi-source BFS' },
      { name: 'LRU Cache', nc: 'lru-cache', why: 'Design with dict + ordering' },
      { name: 'Top K Frequent Elements', nc: 'top-k-elements-in-list', why: 'Counter + heap' },
      { name: 'Merge K Sorted Lists', nc: 'merge-k-sorted-linked-lists', why: 'Heap of list heads' },
      { name: 'Course Schedule', nc: 'course-schedule', why: 'Topological sort' },
      { name: 'Word Ladder', nc: 'word-ladder', why: 'BFS on implicit graph' },
      { name: 'Valid Parentheses', nc: 'validate-parentheses', why: 'Stack' },
      { name: 'Trapping Rain Water', nc: 'trapping-rain-water', why: 'Two pointers' },
      { name: 'K Closest Points to Origin', nc: 'k-closest-points-to-origin', why: 'Heap' },
    ],
    build: [{ name: 'Design a parking lot (object-oriented design)', why: 'OOD comes up in some new grad loops' }],
    behavioral: [
      { q: 'Tell me about a project with a tight deadline.', tests: 'Deliver Results, Bias for Action', reported: true },
      { q: 'Tell me about a time you received critical feedback.', tests: 'Learn and Be Curious, Earn Trust', reported: true },
      { q: 'Tell me about a time you had to prioritize one thing over another.', tests: 'Ownership, judgment', reported: true },
      { q: 'Tell me about a time you went above and beyond for a customer or user.', tests: 'Customer Obsession' },
      { q: 'Tell me about a time you disagreed with your team and what happened.', tests: 'Have Backbone; Disagree and Commit' },
      { q: 'Tell me about a time you dug into data to find the real problem.', tests: 'Dive Deep' },
      { q: 'Tell me about a time you took on something outside your role.', tests: 'Ownership' },
    ],
    sources: [
      { label: 'Amazon Leadership Principles', url: 'https://www.amazon.jobs/content/en/our-workplace/leadership-principles' },
      { label: 'igotanoffer: Amazon SDE interview', url: 'https://app.igotanoffer.com/blogs/tech/amazon-software-development-engineer-interview' },
    ],
  },
  {
    id: 'google',
    shape: 'Reports describe an online assessment or phone screen, then 2–3 coding rounds and a Googleyness & Leadership round. Explaining your reasoning and complexity out loud is graded heavily. Newer formats add code comprehension and AI-assisted rounds.',
    coding: [
      { name: 'Koko Eating Bananas', nc: 'eating-bananas', why: 'Binary search on the answer' },
      { name: 'Capacity To Ship Packages Within D Days', url: lc('capacity-to-ship-packages-within-d-days'), why: 'Reported close match for an L3 round' },
      { name: 'Partition Equal Subset Sum', nc: 'partition-equal-subset-sum', why: 'Reported basis for an onsite question' },
      { name: 'First Bad Version', url: lc('first-bad-version'), why: 'A "first bad commit" variant was reported' },
      { name: 'Longest Increasing Subsequence', nc: 'longest-increasing-subsequence', why: 'DP + binary search' },
      { name: 'Word Ladder', nc: 'word-ladder', why: 'BFS' },
      { name: 'Alien Dictionary', nc: 'foreign-dictionary', why: 'Topological sort' },
      { name: 'Median of Two Sorted Arrays', nc: 'median-of-two-sorted-arrays', why: 'Hard binary search' },
      { name: 'Merge Intervals', nc: 'merge-intervals', why: 'Sort + sweep' },
      { name: 'Find Median From Data Stream', nc: 'find-median-in-a-data-stream', why: 'Two heaps' },
    ],
    behavioral: [
      { q: 'Given a problem and a situation (for example, a teammate missing deadlines), how would you handle it?', tests: 'Googleyness questions are often hypothetical scenarios', reported: true },
      { q: 'What is the most rewarding part of developing something for you?', tests: 'Motivation', reported: true },
      { q: 'Tell me about a time you worked with an ambiguous problem.', tests: 'Comfort with ambiguity' },
      { q: 'Tell me about a time you helped a teammate succeed.', tests: 'Collaboration, humility' },
      { q: 'Tell me about a mistake you made and what you did after.', tests: 'Learning from failure' },
    ],
    sources: [
      { label: 'LeetCode Discuss: Google L3 experiences', url: 'https://leetcode.com/discuss/interview-experience/4778433/Google-or-SDE-2-(L3)-or-Interview-Experience-India' },
      { label: 'Exponent: Google new grad guide', url: 'https://www.tryexponent.com/guides/google-software-engineer-new-grad-interview' },
    ],
  },
  {
    id: 'microsoft',
    shape: 'New grad reports usually describe 3 rounds: 1 mostly behavioral and 2 technical, each technical round with about one LeetCode medium (arrays, graphs, tree traversals) plus behavioral questions.',
    coding: [
      { name: 'LRU Cache', nc: 'lru-cache', why: 'Reported in Microsoft new grad loops' },
      { name: 'Binary Tree Level Order Traversal', nc: 'level-order-traversal-of-binary-tree', why: 'Tree traversal questions are commonly reported' },
      { name: 'Reverse Linked List', nc: 'reverse-a-linked-list', why: 'Linked list basics' },
      { name: 'Number of Islands', nc: 'count-number-of-islands', why: 'Graph/array question' },
      { name: 'Spiral Matrix', nc: 'spiral-matrix', why: 'Array index handling' },
      { name: 'Lowest Common Ancestor of a BST', nc: 'lowest-common-ancestor-in-binary-search-tree', why: 'Trees' },
      { name: 'Merge Two Sorted Lists', nc: 'merge-two-sorted-linked-lists', why: 'Linked lists' },
      { name: 'Valid Sudoku', nc: 'valid-sudoku', why: 'Hash sets on a grid' },
    ],
    behavioral: [
      { q: 'Why Microsoft?', tests: 'Motivation', reported: true },
      { q: 'Tell me about a Microsoft product you use. How would you improve it?', tests: 'Product sense, customer focus', reported: true },
      { q: 'Tell me about a hard bug you debugged.', tests: 'A behavioral round asked about debugging', reported: true },
      { q: 'Tell me about a time you learned something quickly.', tests: 'Growth mindset' },
      { q: 'Tell me about a time you led a team or a project.', tests: 'Leadership, teamwork', reported: true },
    ],
    sources: [
      { label: 'Taro: Microsoft new grad experiences', url: 'https://www.jointaro.com/interviews/companies/microsoft/experiences/software-engineer-new-grad-united-states-april-19-2024-declined-offer-positive-8f5a3003' },
      { label: 'igotanoffer: Microsoft SDE interview', url: 'https://igotanoffer.com/blogs/tech/microsoft-software-development-engineer-interview' },
    ],
  },
  {
    id: 'apple',
    shape: 'Team-specific. Reports describe recruiter and hiring-manager screens, LeetCode mediums, and detailed resume and project questions; some teams ask OS or scripting questions.',
    coding: [
      { name: 'Invert Binary Tree', nc: 'invert-a-binary-tree', why: 'Reported ("reverse a binary tree")' },
      { name: 'Merge Intervals', nc: 'merge-intervals', why: 'Appears in reported Apple question lists' },
      { name: 'LRU Cache', nc: 'lru-cache', why: 'Design basics' },
      { name: 'Valid Parentheses', nc: 'validate-parentheses', why: 'Stack' },
      { name: 'Two Sum', nc: 'two-integer-sum', why: 'Hash map' },
      { name: 'Product of Array Except Self', nc: 'products-of-array-discluding-self', why: 'Arrays' },
      { name: 'Longest Substring Without Repeating Characters', nc: 'longest-substring-without-duplicates', why: 'Sliding window' },
    ],
    build: [{ name: 'Explain polymorphism vs inheritance; OS basics (process vs thread, memory)', why: 'Reported concept questions' }],
    behavioral: [
      { q: 'Describe the architecture and class structure of a component in one of your projects.', tests: 'Depth of ownership', reported: true },
      { q: "How would you learn a codebase if you couldn't reach the engineers who wrote it?", tests: 'Independence, resourcefulness', reported: true },
      { q: 'Tell me about a time you mentored someone or were mentored.', tests: 'Reported mentorship-based questions', reported: true },
      { q: 'Why this team at Apple?', tests: 'Team-specific motivation' },
    ],
    sources: [
      { label: 'Interview Query: Apple SWE', url: 'https://www.interviewquery.com/guides/apple-software-engineer' },
      { label: 'Glassdoor: Apple SWE interviews', url: 'https://www.glassdoor.com/Interview/Apple-Interview-E1138-RVW519299.htm' },
    ],
  },
  {
    id: 'netflix',
    shape: "Team-driven loops with heavy weight on the culture memo. One guide says new grads follow a separate process: a take-home, then two interview rounds. Interviewers ask themselves the keeper test: would I fight to keep this person?",
    coding: [
      { name: 'LRU Cache', nc: 'lru-cache', why: 'Base for the reported TTL cache question' },
      { name: 'Time Based Key Value Store', nc: 'time-based-key-value-store', why: 'Time-aware storage' },
      { name: 'Merge Intervals', nc: 'merge-intervals', why: 'Scheduling-style problems' },
      { name: 'Top K Frequent Elements', nc: 'top-k-elements-in-list', why: 'Ranking' },
    ],
    build: [{ name: 'Implement a TTL cache. What if you never evict expired entries? How would you compact it?', why: 'Reported Netflix question' }],
    behavioral: [
      { q: 'What did you take away from our culture memo? What do you disagree with?', tests: 'Genuine engagement with the memo', reported: true },
      { q: 'How do you feel about the keeper test?', tests: 'Comfort with high performance culture', reported: true },
      { q: 'What does "freedom and responsibility" mean to you in practice?', tests: 'Judgment without process', reported: true },
      { q: 'Tell me about a time you gave candid feedback to a peer.', tests: 'Candor' },
    ],
    sources: [
      { label: 'Netflix culture memo', url: 'https://jobs.netflix.com/culture' },
      { label: 'Exponent: Netflix SWE guide', url: 'https://www.tryexponent.com/guides/netflix-software-engineer-interview' },
      { label: 'DataInterview: Netflix SWE guide', url: 'https://www.datainterview.com/blog/netflix-software-engineer-interview' },
    ],
  },
  {
    id: 'openai',
    shape: 'Practical coding: building working, extensible code under follow-ups rather than puzzle recognition. Reports repeatedly mention building an in-memory database and an LRU cache, plus a behavioral round about the mission.',
    coding: [
      { name: 'LRU Cache', nc: 'lru-cache', why: 'Called the most common onsite coding problem in one analysis of reports' },
      { name: 'Time Based Key Value Store', nc: 'time-based-key-value-store', why: 'Close to the reported time-based in-memory DB' },
      { name: 'Serialize And Deserialize Binary Tree', nc: 'serialize-and-deserialize-binary-tree', why: 'Serialization questions are reported' },
      { name: 'Design Twitter', nc: 'design-twitter-feed', why: 'Class design with state' },
      { name: 'Implement Trie Prefix Tree', nc: 'implement-prefix-tree', why: 'Class design' },
    ],
    build: [
      { name: 'Build an in-memory database: set/get/delete, then query with filters and ORDER BY, then transactions', why: 'Reported many times' },
      { name: 'Add TTL / time-based state to a key-value store', why: 'Reported' },
      { name: 'Persistent key-value store; map serialization and deserialization', why: 'Reported' },
    ],
    behavioral: [
      { q: "Why OpenAI? What do you think about AI safety?", tests: 'Mission alignment' },
      { q: 'Tell me about something you built and shipped quickly.', tests: 'Speed with quality' },
      { q: 'Tell me about a time requirements changed midway.', tests: 'Adaptability, matches the follow-up-heavy coding style' },
    ],
    sources: [
      { label: 'Interview Query: OpenAI SWE', url: 'https://www.interviewquery.com/guides/openai-software-engineer' },
      { label: 'igotanoffer: OpenAI interview questions', url: 'https://igotanoffer.com/en/advice/openai-interview-questions' },
      { label: 'OpenAI Charter', url: 'https://openai.com/charter/' },
    ],
  },
  {
    id: 'nvidia',
    shape: 'Rarely a pure algorithm grind: reports mix LeetCode-style coding with C/C++, operating systems, concurrency and project deep dives, and vary a lot by team.',
    coding: [
      { name: 'Reverse Linked List', nc: 'reverse-a-linked-list', why: 'Linked list questions are reported' },
      { name: 'Rotate Image', nc: 'rotate-matrix', why: 'Matrix questions are reported' },
      { name: 'Spiral Matrix', nc: 'spiral-matrix', why: 'Matrix indexing' },
      { name: 'Number of 1 Bits', nc: 'number-of-one-bits', why: 'Bit manipulation' },
      { name: 'Reverse Bits', nc: 'reverse-bits', why: 'Bit manipulation' },
      { name: 'LRU Cache', nc: 'lru-cache', why: 'Design' },
    ],
    build: [
      { name: 'Implement a thread-safe queue', why: 'Reported new grad question' },
      { name: 'Mutex vs semaphore; analyze a multithreaded snippet', why: 'Reported concurrency questions' },
      { name: 'Are you comfortable with C++? (be ready for pointers, RAII, virtual functions)', why: 'Reported' },
    ],
    behavioral: [
      { q: 'Walk me through your most technical project in depth.', tests: 'Resume deep dives are common' },
      { q: 'Why this team and this part of the stack?', tests: 'Team fit' },
    ],
    sources: [
      { label: 'Interview Query: Nvidia SWE', url: 'https://www.interviewquery.com/guides/nvidia-software-engineer' },
      { label: 'Glassdoor: Nvidia new grad interviews', url: 'https://www.glassdoor.com.au/Interview/NVIDIA-Interview-E7633-RVW20564769.htm' },
    ],
  },
  {
    id: 'citadel',
    shape: 'Online assessment (often HackerRank), then technical rounds that each open with behavioral questions followed by LeetCode medium or hard. Reported topics: dynamic programming, BFS on graphs, heaps, prefix sums with hashing, and modular arithmetic.',
    coding: [
      { name: 'Coin Change', nc: 'coin-change', why: 'DP' },
      { name: 'Number of Connected Components', nc: 'count-connected-components', why: 'A disconnected-graph question was reported' },
      { name: 'Rotting Oranges', nc: 'rotting-fruit', why: 'BFS' },
      { name: 'Find Median From Data Stream', nc: 'find-median-in-a-data-stream', why: 'Heaps' },
      { name: 'Subarray Sum Equals K', url: lc('subarray-sum-equals-k'), why: 'Prefix sum + hashing, and explain why it is correct' },
      { name: 'N Queens', nc: 'n-queens', why: 'A LeetCode-hard backtracking problem was reported' },
      { name: 'Pow(x, n)', nc: 'pow-x-n', why: 'Modular arithmetic came up in an OA' },
      { name: 'Task Scheduler', nc: 'task-scheduling', why: 'Heap + greedy' },
    ],
    behavioral: [
      { q: 'Why Citadel, and why trading over big tech?', tests: 'Motivation' },
      { q: 'How do you feel about long hours and a high-intensity environment?', tests: 'A blunt commitment question was reported', reported: true },
      { q: 'Tell me about a time you were wrong and how fast you changed course.', tests: 'Intellectual honesty' },
    ],
    sources: [
      { label: 'Interview Query: Citadel SWE', url: 'https://www.interviewquery.com/interview-guides/citadel-software-engineer' },
      { label: 'Glassdoor: Citadel new grad SWE', url: 'https://www.glassdoor.ca/Interview/Citadel-Software-Engineer-New-Grad-Interview-Questions-EI_IE14937.0,7_KO8,34.htm' },
    ],
  },
  {
    id: 'hrt',
    shape: 'CodeSignal-style online assessment (one report: 4 questions in 70 minutes), then technical rounds. Core developer roles go deep on OS, memory and networking; some roles report practical backend coding instead of LeetCode.',
    coding: [
      { name: 'Generate Parentheses', nc: 'generate-parentheses', why: 'Recursion on strings was reported' },
      { name: 'Number of Islands', nc: 'count-number-of-islands', why: 'DFS was reported' },
      { name: 'Design Insert/Delete/GetRandom O(1)', url: lc('insert-delete-getrandom-o1'), why: 'A weighted-sampling variant was reported' },
      { name: 'Design Circular Deque', url: lc('design-circular-deque'), why: 'Base for the reported indexable deque' },
      { name: 'Design HashMap', url: lc('design-hashmap'), why: 'Reported: a hashmap that handles collisions and resizing' },
      { name: 'LRU Cache', nc: 'lru-cache', why: 'Data structure from scratch' },
      { name: 'Sliding Window Maximum', nc: 'sliding-window-maximum', why: 'Deque' },
    ],
    build: [
      { name: 'Design a deque with O(1) push/pop at both ends and O(1) random access', why: 'Reported' },
      { name: 'Stack vs heap, process memory layout, segfault causes, alignment, inline trade-offs', why: 'Reported low-level topics' },
      { name: 'Causes of latency spikes on one machine', why: 'Reported scenario question' },
      { name: 'Route network packets between one hub and many node servers', why: 'Reported design question' },
    ],
    behavioral: [
      { q: 'Why HRT?', tests: 'Interest in engineering-led trading' },
      { q: 'Tell me about the hardest performance problem you have solved.', tests: 'Systems curiosity' },
    ],
    sources: [
      { label: 'PracHub: HRT SWE question guide', url: 'https://prachub.com/interview-guide/hudson-river-trading-software-engineer-interview-questions-guide-2026' },
      { label: 'Glassdoor: HRT interviews', url: 'https://www.glassdoor.com/Interview/Hudson-River-Trading-Interview-E470937-RVW102962890.htm' },
      { label: 'HRT blog: preparing for the SWE interview', url: 'https://www.hudsonrivertrading.com/?p=10041' },
    ],
  },
  {
    id: 'janestreet',
    shape: 'A technical interview over Zoom, then final rounds in the office. Problems start simple and grow with follow-ups; interviewers focus on reasoning and clean code more than speed. Some candidates also report logic or probability questions.',
    coding: [
      { name: 'Valid Sudoku', nc: 'valid-sudoku', why: 'Board-checking logic, similar to a reported connect-four winner check' },
      { name: 'Course Schedule II', nc: 'course-schedule-ii', why: 'Graphs are a noted emphasis' },
      { name: 'Clone Graph', nc: 'clone-graph', why: 'Graph traversal' },
      { name: 'Design Twitter', nc: 'design-twitter-feed', why: 'Stateful design that grows with requirements' },
      { name: 'Time Based Key Value Store', nc: 'time-based-key-value-store', why: 'Clean data modeling' },
      { name: 'Word Search', nc: 'search-for-word', why: 'Grid search' },
    ],
    build: [
      { name: 'Exchange arbitrage system with quote throughput (low-level design)', why: 'Reported intern question' },
      { name: 'How would you redesign it if concurrency were a concern?', why: 'Reported follow-up style' },
    ],
    behavioral: [
      { q: 'Why Jane Street?', tests: 'Motivation, curiosity' },
      { q: 'Tell me about a time you changed your mind after new evidence.', tests: 'Intellectual honesty' },
      { q: 'How do you work through a problem with someone else?', tests: 'Collaboration, the core of their interview style' },
    ],
    sources: [
      { label: 'Jane Street: preparing for a SWE interview', url: 'https://www.janestreet.com/preparing-for-a-software-engineering-interview/' },
      { label: 'Interview Query: Jane Street SWE', url: 'https://www.interviewquery.com/guides/jane-street-software-engineer' },
      { label: 'Exponent: Jane Street SWE guide', url: 'https://www.tryexponent.com/guides/jane-street-software-engineer-interview' },
    ],
  },
];

BANKS.push(
  {
    id: 'goldman',
    shape: 'HackerRank OA (two coding questions, occasionally hard, plus math for some tracks), a HireVue behavioral, then a Superday of two or more 45 minute rounds mixing LeetCode style questions, resume deep dives and sometimes system design.',
    coding: [
      { name: 'Two Sum', nc: 'two-integer-sum', why: 'Hash map warm up, array questions are common' },
      { name: 'Reverse Linked List', nc: 'reverse-a-linked-list', why: 'A linked list plus an array question was reported for Superday' },
      { name: 'Valid Parentheses', nc: 'validate-parentheses', why: 'Stack questions were reported' },
      { name: 'Gas Station', nc: 'gas-station', why: 'Reported by name' },
      { name: 'Best Time to Buy and Sell Stock', nc: 'buy-and-sell-crypto', why: 'Finance flavored favorite' },
      { name: 'Merge Intervals', nc: 'merge-intervals', why: 'Common array question' },
      { name: 'LRU Cache', nc: 'lru-cache', why: 'Design style coding' },
      { name: 'Trapping Rain Water', nc: 'trapping-rain-water', why: 'Hard OA practice' },
      { name: 'Longest Substring Without Repeating Characters', nc: 'longest-substring-without-duplicates', why: 'Sliding window' },
    ],
    build: [
      { name: 'How would you design a database backup pipeline?', why: 'Reported Superday design question' },
      { name: 'OS questions: processes vs threads, memory', why: 'Reported alongside a stack question' },
    ],
    behavioral: [
      { q: 'Walk me through your resume.', tests: 'A crisp 2 minute narrative', reported: true },
      { q: 'How would you welcome a new member onto the team?', tests: 'Teamwork and culture', reported: true },
      { q: 'Why Goldman Sachs, and why engineering at a bank?', tests: 'Motivation' },
      { q: 'Tell me about a time you had to deliver under a tight deadline.', tests: 'Ownership, client service' },
    ],
    sources: [
      { label: 'Glassdoor: Goldman Sachs engineering interviews', url: 'https://www.glassdoor.com/Interview/Goldman-Sachs-Interview-E2800-RVW61540897.htm' },
      { label: 'Taro: Goldman Sachs SWE summer analyst', url: 'https://www.jointaro.com/interviews/companies/goldman-sachs/experiences/software-engineering-summer-analyst-warsaw-masovia-february-1-2025-accepted-offer-positive-235e0ef4/' },
      { label: 'Interview Query: Goldman Sachs SWE', url: 'https://www.interviewquery.com/interview-guides/goldman-sachs-software-engineer' },
      { label: 'LeetCode Discuss: GS New Analyst offer', url: 'https://leetcode.com/discuss/interview-experience/885730/goldman-sachs-new-analyst-2021-engineering-salt-lake-city-utah-oct-2020-offer/' },
    ],
  },
  {
    id: 'jpmorgan',
    shape: 'HackerRank OA with two coding questions, a HireVue with behavioral questions (sometimes coding where you record your reasoning), then Code for Good or a Superday with one technical and one behavioral round of 45 minutes each.',
    coding: [
      { name: 'Best Time to Buy and Sell Stock', nc: 'buy-and-sell-crypto', why: 'Reported in a 2026 OA' },
      { name: 'Decode Ways', nc: 'decode-ways', why: 'Reported in a HireVue coding round' },
      { name: 'Climbing Stairs', nc: 'climbing-stairs', why: 'Fibonacci style questions were reported' },
      { name: 'Valid Anagram', nc: 'is-anagram', why: 'String questions are common' },
      { name: 'Group Anagrams', nc: 'anagram-groups', why: 'Hash map grouping' },
      { name: 'Top K Frequent Elements', nc: 'top-k-elements-in-list', why: 'Filtering and counting, similar to a reported API query filter task' },
      { name: 'Merge Intervals', nc: 'merge-intervals', why: 'Common medium' },
    ],
    build: [
      { name: 'Given a string of API queries, filter them with given criteria', why: 'Reported coding task' },
      { name: 'What is OOP? What is a database index?', why: 'Reported Superday questions' },
      { name: 'Build a small full stack app with a team in a day (Code for Good)', why: 'Final round format for many candidates' },
    ],
    behavioral: [
      { q: 'Tell me about your experience working on a project with a team.', tests: 'Teamwork', reported: true },
      { q: 'What was the biggest challenge you overcame?', tests: 'Resilience', reported: true },
      { q: 'How do you learn a new skill with no prior experience?', tests: 'Growth mindset', reported: true },
      { q: 'Why JPMorgan Chase?', tests: 'Motivation' },
    ],
    sources: [
      { label: 'Glassdoor: JPMorgan SWE interviews', url: 'https://static.glassdoor.com.ar/Interview/J-P-Morgan-Interview-E145-RVW59520888.htm' },
      { label: 'Glassdoor: JPMorganChase new grad 2026', url: 'https://www.glassdoor.sg/Interview/JPMorganChase-Interview-E5224839-RVW103540848.htm' },
      { label: 'Taro: JPMorgan SWE intern, Code for Good', url: 'https://www.jointaro.com/interviews/companies/jpmorgan-chase/experiences/software-engineering-intern-plano-texas-october-1-2025-no-offer-positive-2c70c6ba' },
    ],
  },
);

/** Questions every company asks in some form. */
export const GENERAL_BEHAVIORAL: BehavioralQ[] = [
  { q: 'Tell me about yourself.', tests: '90-second story: now, two highlights, why this role' },
  { q: 'Tell me about a project you are proud of.', tests: 'Depth, ownership, measurable result' },
  { q: 'Tell me about a time you failed.', tests: 'Self-awareness and what changed after' },
  { q: 'Tell me about a conflict with a teammate.', tests: 'Respectful disagreement, resolution' },
  { q: 'Tell me about a time you had to learn something fast.', tests: 'Growth' },
  { q: 'What questions do you have for us?', tests: 'Genuine curiosity' },
];

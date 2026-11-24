import type { DeckId, Flashcard } from './flashcards';

export interface Res { label: string; url: string; why: string }

/** Go-to free resources per deck. */
const BY_DECK: Record<DeckId, Res[]> = {
  behavioral: [
    { label: 'Tech Interview Handbook: behavioral interviews', url: 'https://www.techinterviewhandbook.org/behavioral-interview/', why: 'How to structure answers, with common questions' },
    { label: 'Amazon Leadership Principles', url: 'https://www.amazon.jobs/content/en/our-workplace/leadership-principles', why: 'The 16 principles Amazon scores every answer against' },
    { label: 'The STAR method, explained', url: 'https://www.themuse.com/advice/star-interview-method', why: 'Situation, Task, Action, Result with examples' },
  ],
  fundamentals: [
    { label: 'Operating Systems: Three Easy Pieces (free book)', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/', why: 'Processes, threads, memory, concurrency, file systems' },
    { label: 'High Performance Browser Networking (free book)', url: 'https://hpbn.co/', why: 'TCP, UDP, TLS, HTTP explained for engineers' },
    { label: 'Use The Index, Luke', url: 'https://use-the-index-luke.com/', why: 'How database indexes really work' },
  ],
  'cpp-systems': [
    { label: 'learncpp.com', url: 'https://www.learncpp.com/', why: 'The clearest free C++ course, including move semantics and smart pointers' },
    { label: 'cppreference', url: 'https://en.cppreference.com/', why: 'Exact rules for every language and library feature' },
    { label: 'What Every Programmer Should Know About Memory', url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf', why: 'Caches, cache lines and memory performance' },
  ],
  python: [
    { label: 'Python data model (official docs)', url: 'https://docs.python.org/3/reference/datamodel.html', why: 'How objects, mutability and dunder methods work' },
    { label: 'Python time complexity (wiki)', url: 'https://wiki.python.org/moin/TimeComplexity', why: 'Cost of every list, dict and set operation' },
    { label: 'Real Python tutorials', url: 'https://realpython.com/', why: 'Deep, readable articles on each language feature' },
  ],
  design: [
    { label: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', why: 'The standard free guide: caching, sharding, load balancing' },
    { label: 'ByteByteGo on YouTube', url: 'https://www.youtube.com/@ByteByteGo', why: 'Short animated explainers of each building block' },
    { label: 'Latency numbers every programmer should know', url: 'https://gist.github.com/jboner/2841832', why: 'The numbers you estimate with' },
  ],
  quant: [
    { label: 'MIT 6.041 Probabilistic Systems (free course)', url: 'https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/', why: 'Expected value, conditional probability, distributions' },
    { label: 'Jane Street puzzles', url: 'https://www.janestreet.com/puzzles/', why: 'The style of thinking quant interviews test' },
    { label: 'Book: A Practical Guide to Quantitative Finance Interviews (the "Green Book")', url: 'https://www.google.com/search?q=practical+guide+to+quantitative+finance+interviews+green+book', why: 'The standard prep book for brain teasers and probability' },
  ],
  'gpu-ai': [
    { label: 'CUDA C++ Programming Guide', url: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/', why: 'Threads, blocks, warps and memory, from Nvidia' },
    { label: 'How to optimize a CUDA matmul kernel', url: 'https://siboehm.com/articles/22/CUDA-MMM', why: 'Step by step from naive to fast: coalescing, shared memory, tiling' },
    { label: 'Karpathy: Neural Networks Zero to Hero', url: 'https://karpathy.ai/zero-to-hero.html', why: 'Build a GPT from scratch to really understand LLMs' },
  ],
};

/** More specific picks when the card is about one of these topics. */
const BY_TOPIC: { re: RegExp; res: Res }[] = [
  { re: /\b(TCP|UDP|handshake|packet|socket)\b/i, res: { label: 'HPBN: Building blocks of TCP', url: 'https://hpbn.co/building-blocks-of-tcp/', why: 'Handshakes, congestion control, head-of-line blocking' } },
  { re: /\b(HTTP|HTTPS|TLS|DNS|REST)\b/i, res: { label: 'MDN: An overview of HTTP', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', why: 'Requests, responses, methods, status codes' } },
  { re: /\b(index|B-?tree|transaction|ACID|isolation|SQL|join)\b/i, res: { label: 'CMU 15-445 Database Systems (free lectures)', url: 'https://15445.courses.cs.cmu.edu/', why: 'Indexes, transactions and isolation levels in depth' } },
  { re: /\b(deadlock|mutex|semaphore|race|thread|process|context switch|virtual memory|page)\b/i, res: { label: 'OSTEP: Concurrency and virtual memory chapters', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/', why: 'Read the chapter matching this card' } },
  { re: /\b(move|rvalue|unique_ptr|shared_ptr|RAII|virtual|vtable|template)\b/, res: { label: 'learncpp: move semantics and smart pointers', url: 'https://www.learncpp.com/cpp-tutorial/introduction-to-smart-pointers-move-semantics/', why: 'The exact topic of this card' } },
  { re: /\b(cache line|false sharing|L1|L2|cache miss|branch predict)/i, res: { label: 'Gallery of processor cache effects', url: 'https://igoro.com/archive/gallery-of-processor-cache-effects/', why: 'Short experiments that show how caches behave' } },
  { re: /\b(GIL|generator|decorator|mutable default|is vs ==|closure|iterator)\b/i, res: { label: 'Python docs: FAQ on design and history', url: 'https://docs.python.org/3/faq/design.html', why: 'Why Python behaves the way this card describes' } },
  { re: /\b(load balanc|consistent hash|shard|replica|CAP|queue|Kafka|rate limit)/i, res: { label: 'System Design Primer: the matching section', url: 'https://github.com/donnemartin/system-design-primer#index-of-system-design-topics', why: 'Find this concept in the topic index' } },
  { re: /\b(warp|kernel|CUDA|shared memory|coalesc|tensor core)/i, res: { label: 'Nvidia: CUDA best practices guide', url: 'https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/', why: 'Memory coalescing, occupancy and warp behavior' } },
  { re: /\b(KV cache|attention|transformer|token|batching|quantiz)/i, res: { label: 'The Illustrated Transformer', url: 'https://jalammar.github.io/illustrated-transformer/', why: 'Attention and transformers, visually' } },
  { re: /\b(expected value|EV|probability|dice|coin|Bayes)\b/i, res: { label: 'Khan Academy: probability', url: 'https://www.khanacademy.org/math/statistics-probability/probability-library', why: 'Quick refresh on the basics this card relies on' } },
];

export function resourcesForCard(card: Flashcard): Res[] {
  const text = `${card.front} ${card.back}`;
  const topic = BY_TOPIC.filter((t) => t.re.test(text)).map((t) => t.res).slice(0, 2);
  const deck = BY_DECK[card.deck] ?? [];
  const seen = new Set<string>();
  return [...topic, ...deck].filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true))).slice(0, 4);
}

export const videoSearch = (card: Flashcard) => `https://www.youtube.com/results?search_query=${encodeURIComponent(card.front.replace(/[?"]/g, '') + ' interview explained')}`;

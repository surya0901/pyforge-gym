import type { CompanyId } from '../types';

export interface DesignStep { title: string; prompt: string; reference: string[] }
export interface DesignProblem {
  id: string;
  title: string;
  summary: string;
  companies: CompanyId[];
  level: 'core' | 'stretch';
  steps: DesignStep[];
  followUps: string[];
}

const STEP = {
  req: 'Requirements',
  est: 'Estimates',
  api: 'API and data model',
  hld: 'High-level design',
  deep: 'Deep dive',
  trade: 'Trade-offs',
};

export const DESIGN_PROBLEMS: DesignProblem[] = [
  {
    id: 'sd-url', title: 'URL shortener', summary: 'Turn long links into short ones and redirect fast.', level: 'core',
    companies: ['amazon', 'microsoft', 'google', 'meta'],
    steps: [
      { title: STEP.req, prompt: 'What must it do, and how big is it?', reference: ['Create a short code for a URL; redirect code → URL; optional custom alias and expiry.', 'Reads dominate (≈100:1). Redirects must be low latency and highly available.', 'Assume 100M new links per month, 10B redirects per month.'] },
      { title: STEP.est, prompt: 'Work out QPS and storage.', reference: ['Writes ≈ 100M / 2.6M s ≈ 40/s. Reads ≈ 4k/s, peak ~10k/s.', '~500 bytes per row × 1.2B per year ≈ 600 GB per year: fits a sharded database comfortably.', '7 base62 characters = 62⁷ ≈ 3.5 trillion codes.'] },
      { title: STEP.api, prompt: 'Define endpoints and the table.', reference: ['POST /links {url, alias?, ttl?} → {code}. GET /{code} → 301/302 redirect.', 'links(code PK, long_url, user_id, created_at, expires_at).', '302 lets you count clicks; 301 gets cached by browsers.'] },
      { title: STEP.hld, prompt: 'Sketch the boxes.', reference: ['Client → load balancer → stateless app servers → cache (Redis) → key-value store (DynamoDB / Cassandra) or sharded SQL.', 'Cache hot codes with an LRU; most traffic is on a small set of links.', 'Analytics events go to a queue, not the redirect path.'] },
      { title: STEP.deep, prompt: 'How do you generate unique codes without collisions?', reference: ['Option A: a counter service hands out ranges of IDs to each app server; base62-encode the ID. No collisions, no coordination per request.', 'Option B: hash the URL (MD5) and take 7 characters, retry on collision. Same URL dedups, but needs a check.', 'Avoid a single global counter on the hot path.'] },
      { title: STEP.trade, prompt: 'What would you change at 10× scale or under attack?', reference: ['Shard by code; replicate across regions; CDN or edge caching for the top links.', 'Rate-limit creation per user/IP; scan URLs for malware.', 'Predictable sequential codes leak volume: shuffle IDs or add randomness.'] },
    ],
    followUps: ['How do you expire links?', 'How would you count unique clicks per day?', 'What happens if the cache cluster dies?'],
  },
  {
    id: 'sd-rate', title: 'Distributed rate limiter', summary: 'Cap requests per user across many servers.', level: 'core',
    companies: ['amazon', 'google', 'microsoft', 'openai', 'netflix'],
    steps: [
      { title: STEP.req, prompt: 'Clarify the rules.', reference: ['Limit per API key / user / IP, e.g. 100 requests per minute, different limits per tier.', 'Return 429 with Retry-After. Must add < 1–2 ms latency and fail open if the limiter is down (usually).'] },
      { title: STEP.hld, prompt: 'Where does the limiter live?', reference: ['In the API gateway or as middleware in each service.', 'Shared counters in Redis, keyed by user + window. Rules in a config service, cached locally.'] },
      { title: STEP.deep, prompt: 'Pick an algorithm and implement it atomically.', reference: ['Token bucket: store tokens and last_refill; on each request refill by elapsed × rate, then take one. Allows short bursts.', 'Do the read-modify-write in a Redis Lua script (or INCR + EXPIRE for fixed windows) so concurrent servers do not race.', 'Sliding window counter: weighted mix of the current and previous window counts, cheap and accurate enough.'] },
      { title: STEP.trade, prompt: 'What breaks at scale?', reference: ['Redis becomes a hot spot: shard by key, or keep local token buckets and sync periodically (slightly over-admits).', 'Multi-region: per-region limits or eventually consistent global counts.', 'For LLM APIs, limit tokens per minute as well as requests.'] },
    ],
    followUps: ['How do you rate-limit by tokens for an LLM API?', 'How would you test it?', 'Fail open or fail closed?'],
  },
  {
    id: 'sd-feed', title: 'News feed', summary: 'Show each user a ranked feed of posts from people they follow.', level: 'core',
    companies: ['meta', 'google', 'microsoft', 'netflix'],
    steps: [
      { title: STEP.req, prompt: 'Scope it.', reference: ['Post text/media; follow users; home feed sorted by rank or recency; paginated.', '1B daily users, feed load < 200 ms, eventual consistency is fine (a post may take seconds to appear).'] },
      { title: STEP.est, prompt: 'Numbers.', reference: ['Feed reads ≫ posts. ~10 feed loads per user per day = 10B/day ≈ 115k QPS average.', 'Posts ~1B/day ≈ 12k QPS writes. Media goes to blob storage + CDN.'] },
      { title: STEP.api, prompt: 'APIs and storage.', reference: ['POST /posts, GET /feed?cursor=, POST /follow.', 'Posts table sharded by post_id; follow graph store; a per-user feed cache (list of post IDs) in Redis.'] },
      { title: STEP.hld, prompt: 'How is a feed built?', reference: ['Post service writes the post, emits an event to a queue.', 'Fan-out workers push the post ID into each follower\'s cached feed (fan-out on write).', 'Feed service reads the cached ID list, hydrates posts and authors, ranks, returns a page.'] },
      { title: STEP.deep, prompt: 'Handle a celebrity with 100M followers.', reference: ['Fan-out on write for normal users; for huge accounts, skip fan-out and merge their recent posts at read time (hybrid).', 'Cap cached feed length (~500 IDs). Inactive users get feeds built lazily on next login.'] },
      { title: STEP.trade, prompt: 'Ranking and freshness trade-offs.', reference: ['Ranking: candidate generation → lightweight model → heavier model on the top few hundred.', 'Cursor pagination over offset (stable with new posts).', 'Precompute vs compute on read is the core trade-off: storage and write cost vs read latency.'] },
    ],
    followUps: ['How do you delete a post everywhere?', 'How do you show "new posts" without a reload?', 'How would you A/B test ranking?'],
  },
  {
    id: 'sd-chat', title: 'Chat / messaging', summary: '1:1 and group messaging with delivery receipts.', level: 'core',
    companies: ['meta', 'apple', 'microsoft', 'amazon'],
    steps: [
      { title: STEP.req, prompt: 'Scope it.', reference: ['1:1 and small groups, online presence, sent/delivered/read receipts, history across devices, offline delivery via push.', 'Low latency (< 500 ms), messages never lost, ordered within a conversation.'] },
      { title: STEP.hld, prompt: 'How do clients connect?', reference: ['Clients hold a WebSocket to a gateway server. A session registry (Redis) maps user → gateway.', 'Send: gateway → chat service → persist → look up recipient\'s gateway → push. Offline → push notification service.'] },
      { title: STEP.api, prompt: 'Data model.', reference: ['messages(conversation_id, message_id, sender, body, created_at), partitioned by conversation_id, clustered by message_id (Cassandra-style).', 'Message IDs: per-conversation sequence or Snowflake-style time-ordered IDs for ordering.'] },
      { title: STEP.deep, prompt: 'Guarantee delivery and ordering.', reference: ['Client generates a message UUID for idempotent retries; server acks after persisting.', 'Recipient acks delivery; server tracks the last delivered ID per device so reconnects sync from there.', 'Group: fan-out per member; very large groups fan out lazily.'] },
      { title: STEP.trade, prompt: 'What about end-to-end encryption?', reference: ['With E2EE (Signal protocol) the server stores ciphertext only: no server-side search, multi-device needs per-device keys.', 'Presence is expensive at scale: send it lazily and with coarse timing.'] },
    ],
    followUps: ['How do you sync history to a new device?', 'Typing indicators?', 'What if a gateway server crashes?'],
  },
  {
    id: 'sd-video', title: 'Video streaming', summary: 'Upload, transcode and stream video worldwide.', level: 'stretch',
    companies: ['netflix', 'google', 'apple', 'amazon'],
    steps: [
      { title: STEP.req, prompt: 'Scope it.', reference: ['Upload, transcode to many resolutions, stream with adaptive bitrate, resume playback, recommendations out of scope.', 'Startup time < 2 s, smooth playback, huge read bandwidth.'] },
      { title: STEP.hld, prompt: 'Upload path and playback path.', reference: ['Upload: client → pre-signed URL to blob storage → event → transcoding pipeline (split into chunks, encode in parallel, H.264/AV1 at several bitrates) → manifests (HLS/DASH).', 'Playback: client fetches manifest, then segments from the nearest CDN edge; metadata from a video service.'] },
      { title: STEP.deep, prompt: 'How does adaptive bitrate work?', reference: ['Video is cut into 2–10 s segments at each bitrate. The player measures throughput and buffer level and picks the bitrate for the next segment.', 'Netflix pre-positions popular titles in ISP-hosted caches (Open Connect) during off-peak hours.'] },
      { title: STEP.trade, prompt: 'Costs and failure modes.', reference: ['Storage multiplies per rendition; encode popular titles with more effort (per-title encoding).', 'Watch progress written asynchronously, eventually consistent.', 'Region failover: route users to another region\'s control plane; the CDN keeps serving.'] },
    ],
    followUps: ['How do you handle a live stream?', 'How would you prevent piracy (DRM)?', 'Where do you log playback quality metrics?'],
  },
  {
    id: 'sd-kv', title: 'Distributed key-value store', summary: 'A Dynamo-style highly available store.', level: 'stretch',
    companies: ['amazon', 'microsoft', 'google', 'hrt'],
    steps: [
      { title: STEP.req, prompt: 'Scope it.', reference: ['get(key), put(key, value). Scales horizontally, survives node failures, tunable consistency.'] },
      { title: STEP.hld, prompt: 'Partitioning and replication.', reference: ['Consistent hashing with virtual nodes spreads keys. Each key is replicated to the next N nodes on the ring.', 'Any node can coordinate a request; gossip protocol shares membership.'] },
      { title: STEP.deep, prompt: 'Consistency and conflicts.', reference: ['Quorums: write to W, read from R, with R + W > N for overlap (e.g. N=3, R=W=2).', 'Conflicts from concurrent writes: last-write-wins (simple, loses data) or vector clocks with client merge.', 'Hinted handoff for temporarily down nodes; anti-entropy with Merkle trees to repair replicas.'] },
      { title: STEP.trade, prompt: 'Storage engine choice.', reference: ['LSM tree: write-ahead log + memtable + sorted files, compaction, Bloom filters to skip files. Great write throughput.', 'B-tree if reads and range queries matter more.'] },
    ],
    followUps: ['How do you add a node without downtime?', 'How do you detect a failed node?', 'Strong consistency: what would you add (Raft)?'],
  },
  {
    id: 'sd-matching', title: 'Order matching engine', summary: 'Match buy and sell limit orders for one exchange.', level: 'core',
    companies: ['citadel', 'hrt', 'janestreet'],
    steps: [
      { title: STEP.req, prompt: 'What must the engine do?', reference: ['Accept limit and market orders, cancel, modify; match with price-time priority; publish trades and book updates.', 'Deterministic, microsecond latency, no lost orders, fair ordering.'] },
      { title: STEP.api, prompt: 'Data structures for one symbol\'s book.', reference: ['Two sides. Each side: price levels sorted (bids descending, asks ascending), each level a FIFO queue of orders.', 'Map order_id → order node for O(1) cancel. Python sketch: dict of price → deque, plus heaps of prices with lazy deletion. C++: arrays indexed by price tick if the range is bounded.'] },
      { title: STEP.deep, prompt: 'Walk through matching an incoming buy.', reference: ['While qty > 0 and best ask ≤ limit price: trade against the oldest order at the best ask, reduce both quantities, remove filled orders and empty levels.', 'Remaining qty rests on the bid side (limit) or is cancelled (market / IOC).', 'Emit trade and book-update events in order.'] },
      { title: STEP.hld, prompt: 'How is the whole system laid out?', reference: ['Gateways (risk checks, auth) → sequencer assigns a global order → single-threaded matching engine per symbol shard → market data publisher (UDP multicast) and drop copy.', 'Single-threaded per symbol avoids locks; determinism lets you replay the input log to rebuild state.'] },
      { title: STEP.trade, prompt: 'Latency and reliability.', reference: ['Keep everything in memory, preallocate, avoid allocation and syscalls on the hot path, pin threads to cores.', 'Durability via the sequenced input log; a hot standby replays the same log.'] },
    ],
    followUps: ['How do you implement cancel in O(1)?', 'How would you add stop orders?', 'How do you shard across many symbols?'],
  },
  {
    id: 'sd-mdfeed', title: 'Market data feed handler', summary: 'Consume an exchange feed and keep a local book.', level: 'stretch',
    companies: ['hrt', 'citadel', 'janestreet'],
    steps: [
      { title: STEP.req, prompt: 'What does it do?', reference: ['Read UDP multicast packets from an exchange, decode messages, maintain order books, publish to strategies with minimal latency.'] },
      { title: STEP.deep, prompt: 'Handle packet loss.', reference: ['Messages carry sequence numbers. On a gap, buffer later packets and request retransmission or recover from a snapshot channel, then replay buffered messages.', 'Exchanges send A/B redundant feeds: arbitrate by taking whichever copy of each sequence number arrives first.'] },
      { title: STEP.hld, prompt: 'Pipeline layout.', reference: ['NIC (often kernel bypass) → decoder thread → book builder → lock-free single-producer/single-consumer ring buffer → strategy threads.', 'Ring buffer = fixed array + head/tail indices, power-of-two size for cheap modulo.'] },
      { title: STEP.trade, prompt: 'Where does latency hide?', reference: ['Allocations, cache misses, branch mispredictions, syscalls, context switches, logging on the hot path.', 'Measure with hardware timestamps and look at the tail, not the mean.'] },
    ],
    followUps: ['Why SPSC instead of a mutex-protected queue?', 'How do you test it with recorded data?', 'How does false sharing show up here?'],
  },
  {
    id: 'sd-llm', title: 'LLM inference service', summary: 'Serve a chat model API to millions of users.', level: 'stretch',
    companies: ['openai', 'nvidia', 'google', 'meta'],
    steps: [
      { title: STEP.req, prompt: 'Scope it.', reference: ['POST /chat with messages, streamed tokens back (SSE). Several model sizes. Per-org rate and token limits.', 'Optimize time to first token and tokens/second; GPUs are the dominant cost.'] },
      { title: STEP.hld, prompt: 'Request path.', reference: ['API gateway (auth, rate limits by tokens) → router picks a model pool by model and load → inference servers on GPUs → stream tokens back.', 'Usage events → queue → billing.'] },
      { title: STEP.deep, prompt: 'Maximize GPU utilization.', reference: ['Continuous batching: add and remove sequences in the batch every decode step.', 'KV cache management (PagedAttention) to fit more concurrent sequences; prefix caching for shared system prompts.', 'Tensor parallelism for models larger than one GPU; quantization (FP8/INT4) for throughput.'] },
      { title: STEP.trade, prompt: 'Scaling and fairness.', reference: ['Autoscale on queue depth and KV-cache occupancy, not CPU. Cold start is slow (loading weights), so keep warm capacity.', 'Priority tiers and per-org fairness so one customer cannot starve others.', 'Prefill and decode can run on separate pools (disaggregated serving).'] },
    ],
    followUps: ['How do you handle a client disconnecting mid-stream?', 'How would you roll out a new model version safely?', 'How do you meter tokens accurately?'],
  },
  {
    id: 'sd-crawler', title: 'Web crawler', summary: 'Crawl billions of pages politely.', level: 'stretch',
    companies: ['google', 'openai', 'amazon'],
    steps: [
      { title: STEP.req, prompt: 'Scope it.', reference: ['Start from seed URLs, fetch pages, extract links, store content; respect robots.txt and per-host politeness; recrawl based on change rate.'] },
      { title: STEP.hld, prompt: 'Components.', reference: ['URL frontier (priority + per-host queues) → fetchers (async I/O, DNS cache) → parser → link extractor → URL filter/dedup → back into the frontier. Content to blob storage.'] },
      { title: STEP.deep, prompt: 'Dedup and politeness at scale.', reference: ['URL dedup with a Bloom filter or a sharded seen-set keyed by normalized URL hash.', 'Content dedup with checksums or SimHash for near-duplicates.', 'One queue per host with a minimum delay; hash hosts to crawler workers so one worker owns each host.'] },
      { title: STEP.trade, prompt: 'Traps and priorities.', reference: ['Spider traps (infinite calendars): cap depth and URLs per host.', 'Prioritize by importance (PageRank-like) and freshness.'] },
    ],
    followUps: ['How do you recover a crashed fetcher\'s work?', 'How would you crawl JavaScript-heavy sites?'],
  },
  {
    id: 'sd-typeahead', title: 'Search autocomplete', summary: 'Suggest top queries as the user types.', level: 'core',
    companies: ['google', 'amazon', 'meta', 'apple'],
    steps: [
      { title: STEP.req, prompt: 'Scope it.', reference: ['Return the top 5–10 completions for a prefix in < 100 ms, ranked by popularity, updated daily or hourly.'] },
      { title: STEP.deep, prompt: 'Data structure.', reference: ['A trie where each node stores its precomputed top-k completions, so a lookup is O(prefix length).', 'Built offline from query logs (aggregate counts with a batch job), then shipped to servers as a snapshot.'] },
      { title: STEP.hld, prompt: 'Serving.', reference: ['Shard the trie by prefix range; replicate for reads. Cache the most common short prefixes; the browser also caches.', 'Debounce on the client (~100 ms) to cut requests.'] },
      { title: STEP.trade, prompt: 'Freshness and safety.', reference: ['Trending queries: blend a real-time stream counter with the daily snapshot.', 'Filter offensive suggestions; personalize lightly at the edges.'] },
    ],
    followUps: ['How would you support typos?', 'How big is the trie for 1B unique queries?'],
  },
];

# Work log: PyForge on DeepSpace

Raw notes for the submission writeup: what the coding agent (Claude Code) did,
and what Surya checked, changed or decided. Add your own bullets under
"Verified / changed by me" as you review each step.

## Starting point

- PyForge already existed as a static React/Vite site on GitHub Pages
  (`surya0901/pyforge`): drills, lessons, flashcards, system design steps.
  Everything lived in `localStorage`; AI needed the user to paste their own
  Anthropic/Gemini key into the browser.
- This repo ports it onto a DeepSpace scaffold (`npm create deepspace@latest`)
  and adds the full-stack parts. The trainer code is under `src/pyforge/`.

## Step 1: scaffold, port, sign-in, synced progress

Agent did:
- Scaffolded with `create-deepspace` 0.44.2. Install failed twice:
  `ERESOLVE` on typescript-eslint, then `EACCES` in the global npm cache. Root
  cause was the cache permissions, fixed by installing with a separate
  `--cache` dir (no `--legacy-peer-deps` needed in the end).
- Read the deepspace-skill and docs (data storage, permissions, server
  actions, collaborative editing). Checked `npx deepspace add --list`: no
  catalog feature fits (the `documents` feature is a Tiptap editor, heavier
  than the per-step notes we need), so the app builds on the primitives
  directly: records, server actions, `createDeepSpaceAI`, `useYjsRoom`.
- Ported the Tailwind v3 theme (CSS-variable palette, paper/night themes) to
  Tailwind v4 `@theme inline`; added the v3 border-color default back.
- React 18 -> 19 type fixes (4 errors). Renamed `useOwn` -> `switchOwn` in
  BlueprintBuilder: it is not a hook, but the name tripped the hooks lint.
- Pyodide (in-browser Python) is copied into `public/pyodide` by a small Vite
  plugin and served same-origin, instead of loading from the GitHub Pages site.
- `/` is a static prerendered landing page; `/gym` is the trainer behind
  `AuthGate` (Google/GitHub sign-in).
- New collection `progress` (one JSON row per user, `read: 'own'`).
  `useProgressSync` adopts a newer remote copy, seeds the row from existing
  browser progress on first sign-in, and debounces writes.
- Removed the "paste your API key" card. AI now goes through server actions.

Verified / changed by me:
- [x] Signed in on the live site; progress and streak shown, "Progress synced"
- [ ] Open /gym in a second browser/profile with the same account: same streak and queue
- [ ] Read `src/pyforge/useProgressSync.ts` and `src/schemas/pyforge-schemas.ts`

Bugs found while testing step 1 locally:
- After OAuth the scaffold redirects to `/home`, which no longer exists. Changed
  to `/gym`, and a signed-out person opening a room invite is forwarded back to
  that room after sign-in (sessionStorage `pyforge.returnTo`).
- `useSample` did `getSample().then(setSample)`. React treats a function passed
  to setState as an updater and calls it, so every page mount fired an empty
  AI request. The server rejected it ("Empty prompt") before spending, which is
  how it showed up. Fixed with `setSample(() => fn)`. (This bug was in the
  original PyForge too.)

## Step 2: AI rubric grader

Agent did:
- `gradeDesign` server action (`src/actions/grading.ts`): the browser sends only
  problem id + answers; the server builds the prompt from its own copy of the
  problem and rubric. (The reference text also ships to the browser for
  "Compare with reference", so it is not secret; what the server protects is
  the score and the AI billing.)
  Claude Sonnet via `createDeepSpaceAI(env, 'anthropic')` with a zod schema
  (`Output.object`) so the grade is structured: 5 axes scored 1-5 with notes,
  per-step verdict + missed points, strengths, one follow-up on the weakest axis.
- Saved as a `design_attempts` record by the action. Users cannot create these
  (RBAC `create: false`), so scores in the history come only from the grader.
- The grade feeds the existing spaced-repetition engine: overall score -> SM-2
  quality, every axis scored 1-2 -> a `design-axis:*` weak-spot tag on Stats.
- Daily caps per user (15 grades, 25 coach replies) in a server-only
  `ai_usage` collection, because the owner pays for every call.

Verified (agent, local):
- Graded a deliberately thin URL-shortener answer: 1.8/5, weakest axis
  scalability, specific missed points (no cache, no code generation strategy,
  blank steps 5-6), sensible follow-up question.
- Deleted the browser's local progress, reloaded: the grade's SRS card and
  the 4 weak-spot tags came back from the server with the same savedAt.

Verified / changed by me:
- [x] Live site: graded my own URL-shortener answer (1.2/5), feedback matched what I skipped; attempt saved in history

## Step 3: live mock interview room

Agent did:
- `/room/:id` (`src/pages/(app)/(protected)/room/[id].tsx`): one `useYjsRoom`
  document per room, one Y.Text per design step, a `meta` Y.Map holding the
  problem id and the latest grade (so everyone in the room sees it). Edits are
  applied as minimal splices so two people typing in one box merge.
- Presence via Yjs awareness: names, colors, and "X is typing" on the step.
- "Show reference" is local state only, never written to the shared doc.

Bug found while testing: a presence render loop. The page re-published its
awareness state on every render and re-rendered on every awareness event:
~3,500 WebSocket frames per second while idle, which wedged the local worker
(every route hung). Measured by wrapping `WebSocket.prototype.send`. Fixed by
depending on primitives and skipping identical peer lists: 2 frames idle.

Verified (agent, local): text typed in the room survives a full reload
(persisted in the YjsRoom Durable Object). Could NOT verify two people at
once: the preview browser can't open a second tab.

Verified / changed by me:
- [x] Live site: same room in normal + incognito window, typing appeared live, "Surya + you" and "Surya is typing" shown

## Decisions and tradeoffs (draft)

- Progress is one JSON record per user, not one row per card: it is only ever
  read and written whole by its owner, and per-card rows would mean hundreds of
  writes per session for no query we need. Design attempts are real rows
  because they are listed, charted and filtered.
- Conflict rule is last-writer-wins by `savedAt`. Two devices answering at the
  same second can drop one answer. Acceptable for one person's study log.
- Side data (story bank, design notes, theme) still lives in `localStorage`.
  Not synced. Next step if continued.

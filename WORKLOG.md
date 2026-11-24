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
- [ ] Sign in with Google or GitHub on localhost, answer a drill, reload: progress persists
- [ ] Open /gym in a second browser/profile with the same account: same streak and queue
- [ ] Read `src/pyforge/useProgressSync.ts` and `src/schemas/pyforge-schemas.ts`

## Decisions and tradeoffs (draft)

- Progress is one JSON record per user, not one row per card: it is only ever
  read and written whole by its owner, and per-card rows would mean hundreds of
  writes per session for no query we need. Design attempts are real rows
  because they are listed, charted and filtered.
- Conflict rule is last-writer-wins by `savedAt`. Two devices answering at the
  same second can drop one answer. Acceptable for one person's study log.
- Side data (story bank, design notes, theme) still lives in `localStorage`.
  Not synced. Next step if continued.

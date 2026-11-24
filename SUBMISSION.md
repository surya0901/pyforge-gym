# PyForge on DeepSpace: submission note

**Live:** https://pyforge-gym.app.space · **Repo:** https://github.com/surya0901/pyforge-gym

## What I built

PyForge is an interview gym for new grad software engineers: Python syntax
recall, bug hunting, pattern recognition, flashcards with spaced repetition,
and system design. I had built it earlier as a static site where everything
lived in `localStorage` and AI needed you to paste your own API key into the
browser. For this exercise I moved it onto DeepSpace and added the three
things a static site can't do:

1. **Your progress follows you.** Sign in with Google or GitHub and your
   spaced-repetition state lives in a per-user record that syncs live between
   devices. Existing browser progress is imported on first sign-in.
2. **An AI interviewer grades system design.** Claude scores your answer on
   five rubric axes against a reference the browser never sees, lists what you
   missed per step, and asks one follow-up on your weakest axis. Every grade is
   saved, shown as a history, and weak axes feed the existing weak-spot engine.
3. **Live mock interview rooms.** "Practice live with a friend" opens a room
   link. Both people edit the same answer sheet in real time, see who is typing
   in which step, and the interviewer can reveal the reference on their own
   screen only. A grade requested in the room shows up for everyone.

The trainer content and UI predate this exercise (under `src/pyforge/`). The
DeepSpace work is the auth, data, AI and realtime layer, the grader and the
room. `git log` and `WORKLOG.md` show exactly what changed.

## DeepSpace integrations used, and why

| Primitive | Used for | Why it earns its place |
|---|---|---|
| Auth (`AuthGate`, Google/GitHub) | `/gym` and rooms are per user | Progress, grades and AI quotas need an identity |
| Records + RBAC | `progress` (one row per user, `read: 'own'`), `design_attempts` (`create: false` for users), `ai_usage` (server only) | Permissions are enforced in the Durable Object, so a user can't read others' data or forge a score |
| Server actions | `gradeDesign`, `askCoach` | The reference answer, rubric and AI billing stay on the server |
| AI proxy (`createDeepSpaceAI`) | Claude Sonnet (grading, structured output via zod), Haiku (coach) | No API key anywhere in the client. The old site's "paste your key" box is gone |
| Yjs rooms + awareness | `/room/:id` shared answer sheet and presence | CRDT merging means two people typing in one box don't overwrite each other |

**Left out on purpose:** payments (it's a free study tool), file storage
(nothing to upload), cron/email reminders (a daily email adds little over the
existing "Today" plan, and I'd rather ship three features that work), and the
`documents` add-on (a full Tiptap editor is heavier than per-step plain text).

## Main tradeoff

**The app owner pays for AI, capped per user.** I could bill each user's own
DeepSpace credits (`authToken: callerJwt`). That makes abuse free for me but
breaks the app for anyone without credits, including reviewers. I chose
owner-billed calls with a server-enforced daily cap (15 grades, 25 coach
replies per user) kept in a collection no client can read or write.

Smaller ones:
- Progress is one JSON record per user, not one row per card. It is only ever
  read and written whole by its owner. Conflicts resolve last-writer-wins by
  timestamp, so two devices answering in the same second can drop one answer.
- Side data (story bank, design notes, theme) is still in `localStorage`.

## What the agent did

I used Claude Code. It scaffolded the app, read the DeepSpace docs and skill,
ported the Tailwind v3 theme to v4, wrote the schemas, sync hook, server
actions, grader UI and room, and tested each in a local browser. Details per
step are in `WORKLOG.md`.

## What I verified or changed

Bugs caught during testing (details in `WORKLOG.md`):
- After sign-in the scaffold redirected to a deleted `/home`. Now it goes to
  `/gym`, and room invitees are forwarded back to their room.
- Every page fired an empty AI request because a function was passed straight
  to React `setState`, which calls it. This bug was in the original PyForge too.
- The room's presence code was in a render loop that sent ~3,500 WebSocket
  frames per second and froze the local worker. We measured it, fixed it, and
  confirmed it sends 2 frames when idle.

Verified:
- Deleted local progress and reloaded: it came back from the server record.
- A thin design answer graded 1.8/5 with specific missed points.
- Room text persists across reloads. Signed-out calls to actions get 401.
- On the live site I signed in, graded my own URL-shortener answer (1.2/5;
  it correctly flagged that I skipped estimates, the data model and scaling,
  and asked how to generate unique codes when two servers race), and saw the
  attempt saved in my history.
- Opened one room in a normal and an incognito window, signed in on both:
  text typed in one appeared live in the other, with "Surya + you" and a
  "Surya is typing" badge on the step being edited.

## If I kept going

Sync the story bank and design notes to records. Add an interviewer role in
rooms (reference visible to the interviewer only, enforced server side, not
just hidden). Add Playwright tests using DeepSpace's multi-user fixture for the
room. Stream grades instead of waiting ~20 s.

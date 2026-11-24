# PyForge on DeepSpace

A new grad coding interview gym, deployed on [DeepSpace](https://docs.deep.space):
**https://pyforge-gym.app.space**

- **Drills** for Python syntax, bug hunting, pattern recognition, flashcards and
  mock OAs, scheduled with spaced repetition.
- **Synced progress.** Sign in with Google or GitHub and your progress lives in a
  per-user record that syncs live across devices.
- **AI-graded system design.** Claude scores your answer on five rubric axes,
  lists what you missed per step, and asks a follow-up on your weakest area.
- **Live mock interview rooms.** Share a link, edit one answer sheet together in
  real time, and see who is typing where.

The submission note (what was built, integrations, tradeoffs, what the agent did
and what I verified) is in [SUBMISSION.md](SUBMISSION.md). The step-by-step log
is in [WORKLOG.md](WORKLOG.md).

## Where things are

| Path | What |
|---|---|
| `src/pyforge/` | The trainer UI and content (ported from the original static site) |
| `src/pyforge/useProgressSync.ts` | Progress sync to the `progress` record |
| `src/schemas/pyforge-schemas.ts` | Collections and their permissions |
| `src/actions/grading.ts` | `gradeDesign` and `askCoach` server actions (Claude via DeepSpace AI) |
| `src/pyforge/components/DesignStudio.tsx`, `GradeReport.tsx` | Grading UI and attempt history |
| `src/pages/(app)/(protected)/room/[id].tsx` | Live room (Yjs + awareness) |
| `src/pages/index.tsx` | Static landing page |

## Run it

```bash
npm install
npx deepspace auth login
npx deepspace dev start   # http://localhost:5173
npx deepspace deploy
```

No API keys are needed: AI calls go through DeepSpace's proxy and are billed to
the app owner's DeepSpace credits, with a per-user daily cap.

# PyForge on DeepSpace: submission note

**Live:** https://pyforge-gym.app.space · **Repo:** https://github.com/surya0901/pyforge-gym


## What I built

PyForge is an interview prep gym I originally made for myself as a static site: Python syntax drills, bug hunting, pattern recognition, flashcards with spaced repetition, and system design practice. Everything lived in localStorage, and the AI features needed you to paste your own API key into the browser. For this exercise I moved it onto DeepSpace and added the three things a static site couldn't do:
- Progress that follows you. You sign in with Google or GitHub and your progress syncs across devices. Whatever was already in your browser gets imported the first time you sign in.
- An AI interviewer for system design. Claude grades your answer on five rubric axes, tells you what you missed in each step, and asks a follow-up on your weakest area. Grades are saved, and low scores feed back into the weak-spot tracker, so the app pushes you toward what you're bad at.
- Live mock interview rooms. You share a link and two people work on the same answer sheet in real time, with a "Surya is typing" indicator on the step someone is editing. The interviewer can reveal the reference answer on their own screen only.

The drill content and most of the UI existed before this exercise. The DeepSpace work is the sign-in, data, AI and realtime layer, plus the grader and the rooms. The commit history shows exactly what changed.


## DeepSpace integrations and why

- Auth: progress, grades and AI limits all need to belong to a person.
- Records with permissions: users can only read their own progress and grades, and they can't create grade records at all. Only the server can, so nobody can fake a score.
- Server actions plus the DeepSpace AI proxy: grading runs on the server, so there is no API key anywhere in the browser anymore.
- Yjs rooms with presence: two people typing in the same box merge instead of overwriting each other.

I skipped payments, file storage and scheduled emails because none of them made the product better. I also considered a competitive two-player duel mode and cut it: matchmaking and timers would have eaten the time, and a reviewer testing alone couldn't really try it. The shared room shows off the same realtime features without those problems.


## Main tradeoff

Who pays for the AI. Billing each user's own DeepSpace credits would protect me from abuse, but it breaks the app for anyone without credits, including reviewers. So the app pays, and the server caps each person at 5 grades and 10 coach replies a day. A grade costs about 4 cents. A smaller tradeoff: progress is stored as one record per user rather than one row per flashcard, because it's only ever read and saved as a whole. The catch is that if two devices save at the exact same moment, the later one wins.


## What the agent did

I used Claude Code. It scaffolded the app, read the DeepSpace docs, ported my Tailwind theme, wrote the schemas, the sync logic, the grader, the room page and the docs, and tested each piece in a local browser. I made the calls on scope, what to cut, a public repo, and lowering the AI limits to protect my free credits.


## What I verified

On the live site I signed in, graded one of my own URL-shortener answers (it scored 1.2/5, and the feedback matched what I'd actually skipped), and checked that the attempt showed up in my history. I opened the same room in a normal window and an incognito window, and typing in one showed up live in the other with the typing indicator. Testing caught three bugs: sign-in redirected to a page that no longer existed; every page fired an empty AI request, because a function was passed straight to React setState, which calls it (that one was in my original site too); and the room had a render loop sending about 3,500 messages a second, which froze the local server. All three are fixed, and the details are in WORKLOG.md in the repo.


## If I kept going

sync the story bank and design notes too, enforce the interviewer role on the server, and add automated two-person tests for the room.


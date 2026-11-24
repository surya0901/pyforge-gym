/**
 * Public landing page (static, prerendered: no auth call, no WebSocket).
 * The trainer itself lives at /gym behind sign-in.
 */
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

const FEATURES = [
  ['Syntax recall, bug hunter, pattern finder', 'Drills built from real interview solutions, scheduled with spaced repetition.'],
  ['AI-graded system design', 'Claude scores your answer on five rubric axes against a reference answer and asks a follow-up on your weakest one.'],
  ['Live mock interview rooms', 'Share a link, work the same design problem together, and see who is editing which step in real time.'],
  ['Progress that follows you', 'Every answer syncs to your account, so your laptop and phone show the same streak and review queue.'],
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
        <div className="text-[44px] font-extrabold leading-none tracking-[-0.04em] text-zinc-100">py<span className="text-violet-400">forge</span></div>
        <h1 className="mt-6 max-w-2xl text-3xl font-semibold leading-tight text-zinc-100 sm:text-4xl">
          The part of coding interviews that breaks under pressure, <span className="hl">drilled until it doesn&apos;t.</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-400">
          A new grad interview gym: exact Python syntax, pattern recognition speed, reading code for bugs, and system design with an AI interviewer.
        </p>
        <div className="mt-8">
          <Link to="/gym" className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-700">
            Open the gym
          </Link>
          <span className="ml-3 text-sm text-zinc-500">Sign in with Google or GitHub. Free.</span>
        </div>
        <ul className="mt-14 grid gap-5 sm:grid-cols-2">
          {FEATURES.map(([t, d]) => (
            <li key={t} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="font-semibold text-zinc-100">{t}</h2>
              <p className="mt-1 text-sm text-zinc-400">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

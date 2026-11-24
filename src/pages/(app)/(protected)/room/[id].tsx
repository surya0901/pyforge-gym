/**
 * Live mock interview room: /room/:id?p=<design problem id>.
 *
 * One Yjs document per room (DeepSpace `YjsRoom` Durable Object, keyed by the
 * room id), holding one Y.Text per design step plus a small `meta` map with the
 * problem id and the latest AI grade. Anyone signed in who has the link can
 * join. Yjs awareness carries who is here and which step each person is
 * typing in. The interviewer can reveal the reference locally; it is never
 * written into the shared document.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getUserColor, useAuthUser, useYjsRoom } from 'deepspace'
import type * as Y from 'yjs'
import { Check, Copy, Eye, EyeOff, Sparkles } from 'lucide-react'
import { DESIGN_PROBLEMS } from '../../../../pyforge/data/design'
import { callAction } from '../../../../pyforge/lib/cloud'
import { GradeReport, type DesignGrade } from '../../../../pyforge/components/GradeReport'
import { Button, Card } from '../../../../pyforge/components/ui'

type Peer = { clientId: number; name: string; color: string; editing: number | null }

/** Bind a Y.Text to React state; writes apply the minimal splice so concurrent edits merge. */
function useYText(doc: Y.Doc, name: string): [string, (next: string) => void] {
  const ytext = useMemo(() => doc.getText(name), [doc, name])
  const [value, setValue] = useState(() => ytext.toString())
  useEffect(() => {
    const update = () => setValue(ytext.toString())
    ytext.observe(update)
    update()
    return () => ytext.unobserve(update)
  }, [ytext])
  const set = (next: string) => {
    const cur = ytext.toString()
    let start = 0
    while (start < cur.length && start < next.length && cur[start] === next[start]) start++
    let endCur = cur.length
    let endNext = next.length
    while (endCur > start && endNext > start && cur[endCur - 1] === next[endNext - 1]) { endCur--; endNext-- }
    doc.transact(() => {
      if (endCur > start) ytext.delete(start, endCur - start)
      if (endNext > start) ytext.insert(start, next.slice(start, endNext))
    })
  }
  return [value, set]
}

function StepEditor({ doc, index, peers, canWrite, onFocus }: {
  doc: Y.Doc; index: number; peers: Peer[]; canWrite: boolean; onFocus: (i: number | null) => void
}) {
  const [value, setValue] = useYText(doc, `step-${index}`)
  const here = peers.filter((p) => p.editing === index)
  return (
    <div className="relative">
      <textarea
        data-testid={`room-step-${index}`}
        value={value}
        disabled={!canWrite}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => onFocus(index)}
        onBlur={() => onFocus(null)}
        rows={4}
        placeholder="Answer in bullets. Everyone in the room sees this live."
        className="w-full resize-y rounded-md border bg-zinc-950 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500"
        style={here[0] ? { borderColor: here[0].color } : undefined}
      />
      {here.length > 0 && (
        <div className="absolute -top-2.5 right-2 flex gap-1">
          {here.map((p) => <span key={p.clientId} className="rounded px-1.5 text-xs font-medium text-white" style={{ background: p.color }}>{p.name} is typing</span>)}
        </div>
      )}
    </div>
  )
}

export default function RoomPage() {
  const { id = '' } = useParams()
  const [search] = useSearchParams()
  const { user } = useAuthUser()
  const { doc, awareness, synced, canWrite } = useYjsRoom(`pyforge-room-${id}`, 'notes')
  const meta = useMemo(() => doc.getMap<string>('meta'), [doc])
  const [metaTick, setMetaTick] = useState(0)
  const [peers, setPeers] = useState<Peer[]>([])
  const [reveal, setReveal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [grading, setGrading] = useState(false)
  const [err, setErr] = useState('')

  // The first person in fixes the room's problem; later joiners follow the room, not their URL.
  useEffect(() => {
    if (!synced) return
    const wanted = search.get('p')
    if (!meta.get('problemId') && wanted && DESIGN_PROBLEMS.some((d) => d.id === wanted)) meta.set('problemId', wanted)
  }, [synced, meta, search])
  useEffect(() => {
    const f = () => setMetaTick((t) => t + 1)
    meta.observe(f)
    return () => meta.unobserve(f)
  }, [meta])

  const problemId = meta.get('problemId') ?? search.get('p') ?? DESIGN_PROBLEMS[0].id
  const prob = DESIGN_PROBLEMS.find((d) => d.id === problemId) ?? DESIGN_PROBLEMS[0]
  const lastGrade = useMemo(() => {
    const raw = meta.get('lastGrade')
    return raw ? (JSON.parse(raw) as { grade: DesignGrade; by: string }) : null
  }, [meta, metaTick]) // metaTick re-reads the Y.Map after a remote change

  // Presence: publish who I am; read everyone else.
  // Depend on primitives, not the `user` object, and only set state when the
  // peer list really changed. An earlier version re-published on every render
  // and re-rendered on every awareness event: a loop of ~3,500 frames/second.
  const myId = user?.id
  const myName = user?.firstName || user?.fullName || 'Someone'
  useEffect(() => {
    if (!myId) return
    awareness.setLocalStateField('user', { name: myName, color: getUserColor(myId) })
  }, [awareness, myId, myName])
  useEffect(() => {
    let last = ''
    const update = () => {
      const next: Peer[] = []
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return
        const s = state as { user?: { name: string; color: string }; editing?: number | null }
        if (s.user) next.push({ clientId, name: s.user.name, color: s.user.color, editing: s.editing ?? null })
      })
      const key = JSON.stringify(next)
      if (key === last) return
      last = key
      setPeers(next)
    }
    awareness.on('change', update)
    update()
    return () => awareness.off('change', update)
  }, [awareness])
  const editingRef = useRef<number | null>(null)
  const setEditing = (i: number | null) => {
    if (editingRef.current === i) return
    editingRef.current = i
    awareness.setLocalStateField('editing', i)
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${location.origin}/room/${id}?p=${prob.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const grade = async () => {
    setGrading(true)
    setErr('')
    try {
      const answers = prob.steps.map((_, i) => doc.getText(`step-${i}`).toString())
      const { grade: g } = await callAction<{ grade: DesignGrade }>('gradeDesign', { problemId: prob.id, answers, source: 'room' })
      // Shared with the room so both people see the same result.
      meta.set('lastGrade', JSON.stringify({ grade: g, by: user?.firstName || 'Someone' }))
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setGrading(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/gym" className="text-[22px] font-extrabold tracking-[-0.04em] text-zinc-100">py<span className="text-violet-400">forge</span></Link>
        <div className="flex items-center gap-3">
          <div data-testid="room-peers" className="flex items-center gap-1.5 text-sm text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {peers.length === 0 ? 'Only you here' : `${peers.map((p) => p.name).join(', ')} + you`}
          </div>
          <Button variant="subtle" onClick={copyLink}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy invite link'}</Button>
        </div>
      </div>

      <p className="text-sm font-medium text-violet-300">Live mock interview</p>
      <h1 className="text-[28px] font-semibold leading-tight text-zinc-100">{prob.title}</h1>
      <p className="mt-1 text-zinc-400">{prob.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <button onClick={() => setReveal((r) => !r)} className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100">
          {reveal ? <EyeOff size={15} /> : <Eye size={15} />}{reveal ? 'Hide reference' : 'Interviewer: show reference (only on your screen)'}
        </button>
      </div>

      {!synced ? (
        <p className="mt-8 text-zinc-500">Connecting to the room…</p>
      ) : (
        <ol className="mt-6 space-y-4">
          {prob.steps.map((s, i) => (
            <li key={i}>
              <Card className="p-5">
                <div className="mb-2 flex items-baseline gap-3">
                  <span className="tnum text-sm font-semibold text-violet-400">Step {i + 1}</span>
                  <h3 className="text-lg font-semibold text-zinc-100">{s.title}</h3>
                </div>
                <p className="mb-3 text-zinc-300">{s.prompt}</p>
                <StepEditor doc={doc} index={i} peers={peers} canWrite={canWrite} onFocus={setEditing} />
                {reveal && (
                  <ul className="mt-3 space-y-1.5 border-l-2 border-amber-500 pl-4 text-sm">
                    {s.reference.map((r, k) => <li key={k} className="text-zinc-300">{r}</li>)}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ol>
      )}

      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={grade} disabled={grading || !synced}><Sparkles size={15} />{grading ? 'Grading… (about 20 s)' : 'Grade the room’s answer with AI'}</Button>
          <span className="text-sm text-zinc-500">Everyone here sees the result. It is saved to the history of whoever clicks.</span>
        </div>
        {err && <p className="mt-2 text-sm text-rose-300">{err}</p>}
      </Card>
      {lastGrade && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-zinc-500">Graded by {lastGrade.by}'s request</p>
          <GradeReport grade={lastGrade.grade} prob={prob} />
        </div>
      )}
    </div>
  )
}

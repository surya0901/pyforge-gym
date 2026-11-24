/**
 * AI rubric grading for the system design studio, run in the Worker.
 *
 * The browser sends only the problem id and the candidate's answers; the
 * prompt is built here from the server's copy of the problem and rubric, so a
 * client can't change what it is graded against, and only this action can
 * write a score. (The reference text is not secret: the studio's "Compare
 * with reference" shows it.) Claude is reached through DeepSpace's AI proxy,
 * so no API key ever exists in the browser.
 */

import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createDeepSpaceAI } from 'deepspace/worker'
import type { ActionHandler, ActionTools } from 'deepspace/worker'
import { DESIGN_PROBLEMS } from '../pyforge/data/design'
import type { Env } from '../../worker'

export const GRADER_MODEL = 'claude-sonnet-5-5'
export const COACH_MODEL = 'claude-haiku-5-5'
/** Daily per-user caps. The app owner pays for every call, so these are the brake. */
export const DAILY_GRADES = 15
export const DAILY_ASKS = 25

export const AXES = ['requirements', 'data_model', 'architecture', 'scalability', 'tradeoffs'] as const
export type Axis = (typeof AXES)[number]

const gradeSchema = z.object({
  axes: z.object({
    requirements: z.object({ score: z.number().int().min(1).max(5), note: z.string() }),
    data_model: z.object({ score: z.number().int().min(1).max(5), note: z.string() }),
    architecture: z.object({ score: z.number().int().min(1).max(5), note: z.string() }),
    scalability: z.object({ score: z.number().int().min(1).max(5), note: z.string() }),
    tradeoffs: z.object({ score: z.number().int().min(1).max(5), note: z.string() }),
  }),
  steps: z.array(z.object({ step: z.number().int(), verdict: z.enum(['strong', 'partial', 'missing']), missed: z.array(z.string()) })),
  strengths: z.array(z.string()).max(3),
  followUp: z.string(),
  summary: z.string(),
})
export type DesignGrade = z.infer<typeof gradeSchema> & { weakest: Axis; overall: number }

const RUBRIC = `Score each axis 1-5 against what a strong new grad answer looks like (5 = matches or beats the reference, 3 = right outline with gaps, 1 = missing or wrong).
- requirements: functional + non-functional requirements, scale assumptions, back-of-envelope numbers.
- data_model: API endpoints, schema, keys, choice of store and why.
- architecture: components and request flow; would it actually work end to end.
- scalability: bottlenecks named and handled (caching, sharding, queues, replication, hot keys).
- tradeoffs: alternatives considered, consistency/latency/cost trade-offs stated honestly.`

function today() {
  return new Date().toISOString().slice(0, 10)
}

/** Counts one call against the caller's daily quota. Returns an error string when over. */
async function spend(tools: ActionTools, userId: string, kind: 'grades' | 'asks'): Promise<string | null> {
  const id = `${userId}:${today()}`
  const cur = await tools.get('ai_usage', id)
  const row = cur.success ? ((cur.data as { record: { data: { grades?: number; asks?: number } } }).record.data) : {}
  const used = row[kind] ?? 0
  const cap = kind === 'grades' ? DAILY_GRADES : DAILY_ASKS
  if (used >= cap) return `Daily AI limit reached (${cap} ${kind === 'grades' ? 'gradings' : 'coach replies'}). It resets at midnight UTC.`
  await tools.create('ai_usage', { ownerId: userId, day: today(), grades: row.grades ?? 0, asks: row.asks ?? 0, [kind]: used + 1 }, id)
  return null
}

export const gradeDesign: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  const problemId = String(params.problemId ?? '')
  const prob = DESIGN_PROBLEMS.find((p) => p.id === problemId)
  if (!prob) return { success: false, error: 'Unknown design problem' }
  const raw = Array.isArray(params.answers) ? params.answers : []
  const answers = prob.steps.map((_, i) => String(raw[i] ?? '').slice(0, 4000))
  if (answers.join('').trim().length < 40) return { success: false, error: 'Write at least a few bullets before asking for a grade.' }
  const source = params.source === 'room' ? 'room' : 'solo'

  const over = await spend(tools, userId, 'grades')
  if (over) return { success: false, error: over }

  const prompt = [
    `Problem: ${prob.title}. ${prob.summary}`,
    ...prob.steps.map((s, i) => [
      `\n## Step ${i + 1}: ${s.title}`,
      `Prompt: ${s.prompt}`,
      `Reference (hidden from the candidate): ${s.reference.join(' | ')}`,
      `Candidate answer:\n${answers[i].trim() || '(left blank)'}`,
    ].join('\n')),
    `\nInterviewer follow-ups you may draw from: ${prob.followUps.join(' | ')}`,
  ].join('\n')

  try {
    const claude = createDeepSpaceAI(env, 'anthropic')
    const { output } = await generateText({
      model: claude(GRADER_MODEL),
      maxOutputTokens: 1800,
      system: `You are a fair, specific system design interviewer grading a new grad candidate.\n${RUBRIC}\nFor every step give a verdict and list the concrete reference points the candidate missed (short phrases, max 3 per step, empty if none). strengths: up to 3 specific things they did well. followUp: ONE probing interview question aimed at their weakest axis, phrased as the interviewer would ask it. summary: two sentences, direct, no fluff. Never invent things the candidate wrote.`,
      prompt,
      output: Output.object({ schema: gradeSchema }),
    })
    if (!output) return { success: false, error: 'The grader returned no result. Try again.' }
    const scores = AXES.map((a) => output.axes[a].score)
    const weakest = AXES.reduce((w, a) => (output.axes[a].score < output.axes[w].score ? a : w), AXES[0])
    const overall = Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10
    const grade: DesignGrade = { ...output, weakest, overall }

    const saved = await tools.create('design_attempts', {
      ownerId: userId, problemId: prob.id, problemTitle: prob.title, source, answers, grade, overall,
    })
    if (!saved.success) return { success: false, error: 'Graded, but could not save the attempt.' }
    return { success: true, data: { attemptId: saved.data.recordId, grade } }
  } catch (e) {
    console.error('[gradeDesign] failed', e instanceof Error ? e.message : String(e))
    return { success: false, error: 'Could not reach the AI grader. Try again in a minute.' }
  }
}

/**
 * The AI coach (Today page review, flashcard answer feedback, behavioral
 * answers). Text in, text out, Haiku, capped per day.
 */
export const askCoach: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  const msgs = Array.isArray(params.messages) ? params.messages : []
  const messages = msgs
    .filter((m): m is { role: string; content: string } => !!m && typeof (m as { content?: unknown }).content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const), content: m.content.slice(0, 12000) }))
  if (!messages.length) return { success: false, error: 'Empty prompt' }

  const over = await spend(tools, userId, 'asks')
  if (over) return { success: false, error: over }
  try {
    const claude = createDeepSpaceAI(env, 'anthropic')
    const { text } = await generateText({
      model: claude(COACH_MODEL),
      maxOutputTokens: 1200,
      system: 'You are PyForge, a concise, honest coding interview coach for new grad software engineers. Plain text, short paragraphs and "- " bullets, no markdown headings or bold.',
      messages,
    })
    return { success: true, data: { text } }
  } catch (e) {
    console.error('[askCoach] failed', e instanceof Error ? e.message : String(e))
    return { success: false, error: 'Could not reach the AI coach. Try again in a minute.' }
  }
}

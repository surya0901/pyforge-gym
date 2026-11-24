import type { CollectionSchema } from 'deepspace/schema'

/**
 * One row per user: the whole spaced-repetition state (cards, streak days,
 * mistake tags, lesson progress). The client only ever reads and writes it as
 * a unit, so it is a single JSON record rather than one row per card.
 * `savedAt` decides which copy wins when two devices race.
 */
export const progressSchema: CollectionSchema = {
  name: 'progress',
  columns: [
    { name: 'state', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'savedAt', storage: 'number', interpretation: 'plain' },
  ],
  permissions: {
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: 'own', create: true, update: 'own', delete: 'own' },
  },
}

/**
 * One row per AI-graded system design attempt. Only the `gradeDesign` server
 * action writes these (create: false for users), so a score in the history
 * always came from the grader, never from the browser.
 */
export const designAttemptsSchema: CollectionSchema = {
  name: 'design_attempts',
  ownerField: 'ownerId',
  columns: [
    { name: 'ownerId', storage: 'text', interpretation: 'plain' },
    { name: 'problemId', storage: 'text', interpretation: 'plain' },
    { name: 'problemTitle', storage: 'text', interpretation: 'plain' },
    { name: 'source', storage: 'text', interpretation: 'plain' }, // 'solo' | 'room'
    { name: 'answers', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'grade', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'overall', storage: 'number', interpretation: 'plain' },
  ],
  permissions: {
    member: { read: 'own', create: false, update: false, delete: 'own' },
    admin: { read: 'own', create: false, update: false, delete: 'own' },
  },
}

/**
 * Per-user, per-day AI call counter. Server-only (no client access at all):
 * the AI calls are billed to the app owner, so this is the abuse brake.
 */
export const aiUsageSchema: CollectionSchema = {
  name: 'ai_usage',
  columns: [
    { name: 'ownerId', storage: 'text', interpretation: 'plain' },
    { name: 'day', storage: 'text', interpretation: 'plain' },
    { name: 'grades', storage: 'number', interpretation: 'plain' },
    { name: 'asks', storage: 'number', interpretation: 'plain' },
  ],
  permissions: {
    member: { read: false, create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: false },
  },
}

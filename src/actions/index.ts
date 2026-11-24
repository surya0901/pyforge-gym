import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { askCoach, gradeDesign } from './grading'

export const actions: Record<string, ActionHandler<Env>> = {
  gradeDesign,
  askCoach,
}

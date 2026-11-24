import type { Exercise } from '../types';
import { BUGS } from './bugs';
import { PATTERN_DRILLS } from './patterns';
import { SYNTAX } from './syntax';

export { BUGS, PATTERN_DRILLS, SYNTAX };
export const ALL: Exercise[] = [...SYNTAX, ...BUGS, ...PATTERN_DRILLS];

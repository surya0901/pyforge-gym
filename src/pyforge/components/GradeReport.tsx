/**
 * Renders one AI rubric grade (from the `gradeDesign` server action, or a
 * saved `design_attempts` record) and turns it into spaced-repetition input.
 */
import { CheckCircle2, CircleAlert, CircleDashed, MessageCircleQuestion } from 'lucide-react';
import type { Axis, DesignGrade } from '../../actions/grading';
import type { DesignProblem } from '../data/design';
import { Card } from './ui';

export type { DesignGrade };

export const AXIS_LABEL: Record<Axis, string> = {
  requirements: 'Requirements and estimates',
  data_model: 'API and data model',
  architecture: 'Architecture',
  scalability: 'Scalability and bottlenecks',
  tradeoffs: 'Trade-offs',
};
const AXES = Object.keys(AXIS_LABEL) as Axis[];

/** Grade -> SM-2 quality, plus a weak-spot tag for each axis scored 1-2. */
export function gradeToReview(g: DesignGrade): { quality: 0 | 1 | 2 | 3; tags: string[] } {
  const quality = g.overall >= 4.5 ? 3 : g.overall >= 3.5 ? 2 : g.overall >= 2.5 ? 1 : 0;
  const tags = AXES.filter((a) => g.axes[a].score <= 2).map((a) => `design-axis:${a}`);
  return { quality, tags };
}

const barColor = (s: number) => (s >= 4 ? 'bg-emerald-500' : s === 3 ? 'bg-amber-500' : 'bg-rose-500');

export function GradeReport({ grade, prob }: { grade: DesignGrade; prob: DesignProblem }) {
  return (
    <Card className="p-5" >
      <div data-testid="grade-report" className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-100">AI interviewer's grade</h3>
        <span className="tnum text-2xl font-bold text-zinc-100">{grade.overall.toFixed(1)}<span className="text-base font-medium text-zinc-500"> / 5</span></span>
      </div>
      <p className="mt-1 text-zinc-300">{grade.summary}</p>

      <ul className="mt-4 space-y-3">
        {AXES.map((a) => {
          const { score, note } = grade.axes[a];
          return (
            <li key={a}>
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${a === grade.weakest ? 'text-rose-300' : 'text-zinc-200'}`}>{AXIS_LABEL[a]}{a === grade.weakest && ' · weakest'}</span>
                <span className="tnum text-zinc-400">{score}/5</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-zinc-800"><div className={`h-1.5 rounded-full ${barColor(score)}`} style={{ width: `${score * 20}%` }} /></div>
              <p className="mt-1 text-sm text-zinc-400">{note}</p>
            </li>
          );
        })}
      </ul>

      {grade.strengths.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-zinc-200">What landed</h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-zinc-300">{grade.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      )}

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-zinc-200">Step by step</h4>
        <ul className="mt-2 space-y-2">
          {grade.steps.map((s) => (
            <li key={s.step} className="flex gap-2 text-sm">
              {s.verdict === 'strong' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" /> : s.verdict === 'partial' ? <CircleDashed size={16} className="mt-0.5 shrink-0 text-amber-400" /> : <CircleAlert size={16} className="mt-0.5 shrink-0 text-rose-400" />}
              <div>
                <span className="font-medium text-zinc-200">{prob.steps[s.step - 1]?.title ?? `Step ${s.step}`}</span>
                {s.missed.length > 0 && <span className="text-zinc-400">: missed {s.missed.join('; ')}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-md border-l-2 border-violet-500 bg-zinc-950 p-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-300"><MessageCircleQuestion size={15} />Follow-up on your weakest area</div>
        <p className="mt-1 text-zinc-200">{grade.followUp}</p>
        <p className="mt-1 text-xs text-zinc-500">Add your answer to the matching step above and grade again.</p>
      </div>
    </Card>
  );
}

/** Compact score history for one problem: newest first. */
export function AttemptHistory({ attempts, onOpen, openId }: {
  attempts: { recordId: string; createdAt?: string; data: { overall: number; source: string; grade: DesignGrade } }[];
  onOpen: (id: string) => void;
  openId?: string;
}) {
  if (!attempts.length) return null;
  return (
    <Card className="mt-4 p-5">
      <h3 className="mb-2 font-semibold text-zinc-100">Your graded attempts</h3>
      <ul className="space-y-1">
        {attempts.map((a) => (
          <li key={a.recordId}>
            <button onClick={() => onOpen(a.recordId)} className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-950 ${openId === a.recordId ? 'bg-zinc-950' : ''}`}>
              <span className="tnum w-10 font-semibold text-zinc-100">{a.data.overall.toFixed(1)}</span>
              <span className="flex flex-1 gap-0.5">
                {AXES.map((ax) => <span key={ax} title={`${AXIS_LABEL[ax]}: ${a.data.grade.axes[ax].score}/5`} className={`h-2 flex-1 rounded-sm ${barColor(a.data.grade.axes[ax].score)}`} />)}
              </span>
              <span className="w-28 text-right text-xs text-zinc-500">{a.data.source === 'room' ? 'live room · ' : ''}{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

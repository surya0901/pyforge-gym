import { Target } from 'lucide-react';
import { useMemo } from 'react';
import { mistakeLog, weakSpots, type WeakSpot } from '../lib/mistakes';
import type { CompanyId, Mode, PatternId, Progress } from '../types';
import { Card } from './ui';
import { MISTAKE_LABEL } from './Dashboard';

interface Props {
  progress: Progress;
  open: (m: Mode, opts?: { deck?: string; focus?: string; company?: CompanyId | 'all'; pattern?: PatternId | 'all' }) => void;
  onLearn: (lessonId?: string) => void;
  limit?: number;
}

/** What you keep getting wrong across every mode, ranked, each with the drill that fixes it. */
export default function WeakSpots({ progress, open, onLearn, limit = 5 }: Props) {
  const spots = useMemo(() => weakSpots(progress, MISTAKE_LABEL), [progress]);
  const week = mistakeLog().filter((m) => m.at > Date.now() - 7 * 86_400_000).length;
  const go = (s: WeakSpot) => (s.action.lesson ? onLearn(s.action.lesson) : open(s.action.mode, { deck: s.action.deck, focus: s.action.focus }));
  const ago = (t: number) => { if (!t) return ''; const d = Math.floor((Date.now() - t) / 86_400_000); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };

  return (
    <Card className="p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-100"><Target size={17} className="text-rose-400" />Train your weak spots</h3>
        <span className="text-sm text-zinc-500">{week} mistakes logged this week</span>
      </div>
      <p className="mb-4 text-sm text-zinc-500">Every slip in Blueprint builder, Pattern finder, Flashcards, Syntax recall and Bug hunter lands here. Recent ones count more, and a spot fades once you stop making that mistake.</p>
      {!spots.length ? (
        <p className="text-sm text-zinc-400">Nothing to fix yet. Do today's checklist and this fills in with exactly what to practice.</p>
      ) : (
        <ol className="space-y-2.5">
          {spots.slice(0, limit).map((s, i) => (
            <li key={s.key} className="grid gap-x-4 gap-y-1 rounded-md border border-zinc-800 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="tnum text-xs text-zinc-500">{i + 1}</span>
                  <span className="font-medium text-zinc-100">{s.title}</span>
                  <span className="text-xs text-zinc-500">{s.area} · {s.count}× {s.last ? `· last ${ago(s.last)}` : ''}</span>
                </div>
                <div className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-400">{s.fix}</div>
              </div>
              <button onClick={() => go(s)} className="link justify-self-start text-sm sm:justify-self-end">{s.action.label}</button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

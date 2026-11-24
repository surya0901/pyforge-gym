import type { ReactNode } from 'react';
import { COMPANY_NAME, PATTERN_NAME } from '../data/meta';
import type { CompanyId, Difficulty, PatternId } from '../types';

/** A sheet of paper laid on the graph-paper desk. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border border-zinc-800 bg-zinc-900 ${className}`}>{children}</div>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-block min-w-[1.4em] rounded-[4px] border border-b-2 border-zinc-700 bg-zinc-900 px-1 text-center font-mono text-[11px] leading-[1.5] text-zinc-400">{children}</kbd>
  );
}

export function PatternTag({ id }: { id: PatternId }) {
  return <span className="text-sm font-medium text-violet-300">{PATTERN_NAME[id]}</span>;
}

const DIFF: Record<Difficulty, string> = {
  easy: 'bg-emerald-500',
  medium: 'bg-amber-600',
  hard: 'bg-rose-500',
};
export function DiffTag({ d }: { d: Difficulty }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-zinc-400">
      <span className={`h-2 w-2 rounded-full ${DIFF[d]}`} />
      {d[0].toUpperCase() + d.slice(1)}
    </span>
  );
}

export function CompanyTags({ ids, max = 4 }: { ids: CompanyId[]; max?: number }) {
  return (
    <span className="text-sm text-zinc-500">
      {ids.slice(0, max).map((c) => COMPANY_NAME[c]).join(', ')}
      {ids.length > max && ` +${ids.length - max}`}
    </span>
  );
}

export function Bar({ value, color = 'bg-violet-500' }: { value: number; color?: string }) {
  return (
    <div className="h-[5px] w-full overflow-hidden rounded-full bg-zinc-800">
      <div className={`h-full rounded-full ${color} transition-[width] duration-500`} style={{ width: `${Math.max(0, Math.min(100, Math.round(value * 100)))}%` }} />
    </div>
  );
}

export function Button({
  children, onClick, variant = 'primary', disabled, className = '', title,
}: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'subtle'; disabled?: boolean; className?: string; title?: string }) {
  const v = {
    primary: 'bg-violet-600 text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-violet-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none',
    subtle: 'border border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-600 disabled:opacity-50',
    ghost: 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 disabled:opacity-50',
  }[variant];
  return (
    <button title={title} disabled={disabled} onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[15px] font-medium transition-colors ${v} ${className}`}>
      {children}
    </button>
  );
}

export function Empty({ text }: { text: string }) {
  return <Card className="p-10 text-center text-zinc-400">{text}</Card>;
}

export function ExerciseHeader({ title, pattern, difficulty, companies, index, total }: {
  title: string; pattern: PatternId; difficulty: Difficulty; companies: CompanyId[]; index: number; total: number;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        <PatternTag id={pattern} />
        <DiffTag d={difficulty} />
        <CompanyTags ids={companies} />
        <span className="tnum ml-auto text-sm text-zinc-500">{index + 1} of {total}</span>
      </div>
      <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-zinc-100">{title}</h2>
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-zinc-100"><span className="hl">{children}</span></h1>
      {sub && <p className="mt-2 max-w-[65ch] text-zinc-400">{sub}</p>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="text-lg font-semibold text-zinc-100">{children}</h3>
      {aside}
    </div>
  );
}

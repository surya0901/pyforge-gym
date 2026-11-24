import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { REFERENCE } from '../data/reference';
import { highlight } from '../lib/highlight';

export function ReferenceContent({ autoFocus = false }: { autoFocus?: boolean }) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) setTimeout(() => ref.current?.focus(), 50); }, [autoFocus]);

  const sections = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return REFERENCE;
    return REFERENCE.map((s) => ({
      ...s,
      rows: s.title.toLowerCase().includes(t) ? s.rows : s.rows.filter((r) => `${r.op} ${r.note ?? ''} ${r.time}`.toLowerCase().includes(t)),
    })).filter((s) => s.rows.length);
  }, [q]);

  return (
    <div>
      <div className="sticky top-0 z-10 bg-zinc-950 pb-3">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 focus-within:border-violet-500">
          <Search size={15} className="text-zinc-500" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: popleft, bisect, heappush, O(1)…"
            className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
        </div>
      </div>
      <div className="space-y-5">
        {sections.map((s) => (
          <section key={s.id}>
            <h3 className="mb-1 font-mono text-sm font-semibold text-violet-300">{s.title}</h3>
            {s.import && <div className="mb-2 font-mono text-[11px]">{highlight(s.import)}</div>}
            <table className="w-full text-left text-[12.5px]">
              <tbody>
                {s.rows.map((r, i) => (
                  <tr key={i} className="border-t border-zinc-800/70 align-top">
                    <td className="whitespace-pre-wrap py-1.5 pr-3 font-mono">{highlight(r.op, `${s.id}${i}`)}</td>
                    <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-amber-300">{r.time}</td>
                    <td className="py-1.5 text-zinc-400">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        {!sections.length && <p className="text-sm text-zinc-500">No matches.</p>}
      </div>
    </div>
  );
}

export function ReferenceDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside className={`absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-5 shadow-2xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">Python DS & Complexity Reference</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><X size={18} /></button>
        </div>
        {open && <ReferenceContent autoFocus />}
      </aside>
    </div>
  );
}

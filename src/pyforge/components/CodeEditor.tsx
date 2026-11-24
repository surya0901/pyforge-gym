import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  errorLine?: number;
  minRows?: number;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}

/** A light Python editor: line numbers, Tab = 4 spaces, auto-indent, Cmd/Ctrl+Enter to run. */
export default function CodeEditor({ value, onChange, onRun, errorLine, minRows = 14, onPaste }: Props) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const lines = value.split('\n').length;
  const rows = Math.max(minRows, lines + 1);

  useEffect(() => { if (gutter.current && ta.current) gutter.current.scrollTop = ta.current.scrollTop; });

  const edit = (text: string, start: number, end: number, caret: number) => {
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => { if (ta.current) { ta.current.selectionStart = ta.current.selectionEnd = caret; } });
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: en } = el;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      if (e.shiftKey) {
        const remove = value.slice(lineStart, lineStart + 4).match(/^ */)![0].length;
        if (remove) edit('', lineStart, lineStart + remove, Math.max(lineStart, s - remove));
      } else edit('    ', s, en, s + 4);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      const line = value.slice(lineStart, s);
      let indent = line.match(/^ */)![0];
      if (/:\s*(#.*)?$/.test(line)) indent += '    ';
      edit('\n' + indent, s, en, s + 1 + indent.length);
      return;
    }
    if (e.key === 'Backspace' && s === en) {
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      const before = value.slice(lineStart, s);
      if (before.length && /^ +$/.test(before)) {
        e.preventDefault();
        const n = before.length % 4 || 4;
        edit('', s - n, s, s - n);
      }
    }
  };

  return (
    <div className="flex overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 font-mono text-[13.5px] leading-[1.6]">
      <div ref={gutter} aria-hidden className="select-none overflow-hidden border-r border-zinc-800 py-3 text-right text-zinc-600" style={{ height: `${rows * 1.6}em` }}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`px-2.5 ${errorLine === i + 1 ? 'bg-rose-500/20 text-rose-300' : ''}`}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={ta}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        onPaste={onPaste}
        onDrop={onPaste ? (e) => e.preventDefault() : undefined}
        onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        aria-label="Code editor"
        className="flex-1 resize-none bg-transparent px-3 py-3 text-zinc-100 outline-none"
        style={{ height: `${rows * 1.6}em`, tabSize: 4, whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto' }}
      />
    </div>
  );
}

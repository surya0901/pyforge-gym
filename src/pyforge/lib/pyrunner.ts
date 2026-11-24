/**
 * Runs Python in the browser with Pyodide inside a Web Worker, so an infinite
 * loop can be killed without freezing the page. The runtime is served from
 * the pyforge site (/pyodide/), about 10 MB, downloaded once and cached.
 */
export interface TestResult { ok: boolean; got?: string; expected?: string; error?: string; line?: number; stdout?: string; ms?: number }
export interface RunResult { compileError?: string; line?: number; results: TestResult[]; timeout?: boolean; loadError?: string }

import STEPCHECK from './stepcheck.py?raw';

// The Pyodide runtime is copied into public/pyodide/ at build (see vite.config.ts),
// so it is served from this app's own origin.
const SITE = location.origin;
const PY_BASE = new URL('/', location.origin).href;

const HARNESS = String.raw`
import json, copy, sys, io, time, traceback

def _norm(x):
    return json.loads(json.dumps(x, default=lambda o: list(o) if isinstance(o, (set, tuple)) else repr(o)))

def _line(tb):
    frames = [f for f in traceback.extract_tb(tb) if f.filename == "solution.py"]
    return frames[-1].lineno if frames else None

def _short(x, n=300):
    s = json.dumps(x) if not isinstance(x, str) else json.dumps(x)
    return s if len(s) <= n else s[:n] + "…"

def _same(a, b, cmp):
    if cmp == "unordered" and isinstance(a, list) and isinstance(b, list):
        return sorted(map(json.dumps, a)) == sorted(map(json.dumps, b))
    return a == b

def pyforge_run(payload):
    p = json.loads(payload)
    ns = {"__name__": "solution"}
    out = io.StringIO()
    real = sys.stdout
    sys.stdout = out
    try:
        exec(compile(p["src"], "solution.py", "exec"), ns)
    except SyntaxError as e:
        sys.stdout = real
        return json.dumps({"compileError": f"{type(e).__name__}: {e.msg}", "line": e.lineno, "results": []})
    except Exception as e:
        sys.stdout = real
        return json.dumps({"compileError": f"{type(e).__name__}: {e}", "line": _line(e.__traceback__), "results": []})
    sys.stdout = real
    target = ns.get(p["func"])
    if target is None:
        return json.dumps({"compileError": f"NameError: {p['func']} is not defined. Keep the given name.", "results": []})
    results = []
    for args, exp in zip(p["tests"], p["expected"]):
        out = io.StringIO()
        sys.stdout = out
        t0 = time.perf_counter()
        try:
            if p["kind"] == "build":
                obj = None
                got = []
                for method, a in args:
                    if method == "__init__":
                        obj = target(*copy.deepcopy(a))
                        got.append(None)
                    else:
                        got.append(getattr(obj, method)(*copy.deepcopy(a)))
            else:
                got = target(*copy.deepcopy(args))
            got = _norm(got)
            ok = _same(got, exp, p["cmp"])
            res = {"ok": ok, "got": _short(got), "expected": _short(exp)}
        except Exception as e:
            res = {"ok": False, "error": f"{type(e).__name__}: {e}", "line": _line(e.__traceback__), "expected": _short(exp)}
        finally:
            sys.stdout = real
        res["ms"] = round((time.perf_counter() - t0) * 1000, 1)
        printed = out.getvalue()
        if printed:
            res["stdout"] = printed[-500:]
        results.append(res)
    return json.dumps({"results": results})
`;

const WORKER_SRC = `
let py = null;
self.onmessage = async (e) => {
  const { type, id, base, payload, harness } = e.data;
  try {
    if (type === 'init') {
      const { loadPyodide } = await import(base + 'pyodide/pyodide.mjs');
      py = await loadPyodide({ indexURL: base + 'pyodide/' });
      py.runPython(harness);
      py.runPython(e.data.stepcheck);
      self.postMessage({ id, ok: true });
    } else if (type === 'run') {
      py.globals.set('__payload', payload);
      const out = py.runPython('pyforge_run(__payload)');
      self.postMessage({ id, ok: true, out });
    } else if (type === 'perf') {
      py.globals.set('__payload', payload);
      const out = py.runPython('pyforge_perf(__payload)');
      self.postMessage({ id, ok: true, out });
    } else if (type === 'steps') {
      py.globals.set('__payload', payload);
      const out = py.runPython('pyforge_steps(__payload)');
      self.postMessage({ id, ok: true, out });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
};`;

type Msg = { ok: boolean; out?: string; error?: string };

/** One Python worker. Tests, step checks and speed checks each get their own, so a slow one never blocks the others. */
class Runner {
  worker: Worker | null = null;
  ready: Promise<void> | null = null;
  seq = 0;
  pending = new Map<number, (m: Msg) => void>();
  call(msg: Record<string, unknown>): Promise<Msg> {
    const id = ++this.seq;
    return new Promise((res) => { this.pending.set(id, res); this.worker!.postMessage({ ...msg, id }); });
  }
  warmUp(): Promise<void> {
    if (this.ready) return this.ready;
    this.worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })), { type: 'module' });
    this.worker.onmessage = (e) => { const r = this.pending.get(e.data.id); this.pending.delete(e.data.id); r?.(e.data); };
    this.ready = this.call({ type: 'init', base: PY_BASE, harness: HARNESS, stepcheck: STEPCHECK }).then((m) => {
      if (!m.ok) { this.ready = null; this.worker?.terminate(); this.worker = null; throw new Error(m.error); }
    });
    return this.ready;
  }
  kill() {
    this.worker?.terminate(); this.worker = null; this.ready = null;
    for (const r of this.pending.values()) r({ ok: false, error: 'stopped' });
    this.pending.clear();
  }
}
const RUN = new Runner(), STEPS = new Runner(), PERF = new Runner();
export const warmUp = () => RUN.warmUp();

export async function runTests(src: string, func: string, kind: string, tests: unknown[], expected: unknown[], cmp: string, timeoutMs = 8000): Promise<RunResult> {
  try { await RUN.warmUp(); } catch (e) { return { results: [], loadError: `Couldn't start Python here (${String((e as Error).message).slice(0, 120)}). Use the pyforge website: ${SITE}` }; }
  const payload = JSON.stringify({ src, func, kind, tests, expected, cmp });
  const timer = new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), timeoutMs));
  const res = await Promise.race([RUN.call({ type: 'run', payload }), timer]);
  if (res === 'timeout') { RUN.kill(); RUN.warmUp().catch(() => {}); return { results: [], timeout: true }; }
  if (!res.ok) return { results: [], compileError: res.error };
  return JSON.parse(res.out!) as RunResult;
}

export interface StepLine { status: 'ok' | 'miss' | 'flow'; what?: string }
export interface StepReport {
  step: number;
  status: 'ok' | 'wrong' | 'empty' | 'error' | 'loop';
  written: boolean;
  lines: StepLine[];
  why?: string[];
  cats?: string[];
  after?: number;
  error?: { msg: string; line?: number };
  loop?: { line?: number };
}
export interface StepCheck {
  steps?: StepReport[];
  commented?: boolean;
  syntax?: { msg: string; line?: number; step: number };
  fatal?: string;
  error?: { msg: string; line?: number; step?: number };
  loop?: { line?: number; step?: number };
  timeout?: boolean;
  loadError?: string;
}

/** Runs your code and the blueprint side by side and reports, step by step, whether your logic makes the same values. */
export async function checkSteps(payload: { user: string; ref: string; fname: string; call: string; tests: unknown[]; expected: unknown[]; postlude: string; nsteps: number }, timeoutMs = 6000): Promise<StepCheck> {
  try { await STEPS.warmUp(); } catch (e) { return { loadError: String((e as Error).message) }; }
  const timer = new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), timeoutMs));
  const res = await Promise.race([STEPS.call({ type: 'steps', payload: JSON.stringify(payload) }), timer]);
  if (res === 'timeout') { STEPS.kill(); STEPS.warmUp().catch(() => {}); return { timeout: true }; }
  if (!res.ok) return { fatal: res.error };
  return JSON.parse(res.out!) as StepCheck;
}

export interface PerfResult { n?: number; ref?: number; mine?: number; ratio?: number; slow?: boolean; skip?: string; timeout?: boolean }
/** Your solution vs the blueprint's on a bigger input. A big gap means a worse time complexity. */
export async function checkPerf(payload: { user: string; ref: string; call: string; tests: unknown[]; postlude: string }, timeoutMs = 7000): Promise<PerfResult> {
  try { await PERF.warmUp(); } catch { return { skip: 'python' }; }
  const timer = new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), timeoutMs));
  const res = await Promise.race([PERF.call({ type: 'perf', payload: JSON.stringify(payload) }), timer]);
  if (res === 'timeout') { PERF.kill(); return { timeout: true, slow: true }; }
  if (!res.ok) return { skip: res.error };
  return JSON.parse(res.out!) as PerfResult;
}

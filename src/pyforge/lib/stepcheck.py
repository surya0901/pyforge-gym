# Step checker for Blueprint builder. Runs inside Pyodide next to the test harness.
#
# Idea: you don't have to type the blueprint's exact words. Your code and the
# reference both run on the same inputs under a tracer, and every line records
# the VALUES it creates or changes (names are ignored, so numSet and num_set are
# the same thing). A step is right when it produces the values the blueprint's
# step produces. When it doesn't, we compare what you made with what was needed
# and explain the gap: wrong type, off by one, missing items, wrong return.

import json, sys, copy, re, math, types as _types
from collections import deque as _deque

_STEP_RE = re.compile(r"#\s*Step\s*(\d+)", re.I)
_CAP = 30000


_LAST = [None]  # return value of the last traced call
_RESULTS = [[]]  # return values of the last _collect, one per test
_NORESULT = object()


class _Cap(Exception):
    pass


def _canon(x, depth=0):
    """A stable string for a value, so values can be compared regardless of variable names."""
    if depth > 6:
        return "…"
    if x is None or isinstance(x, bool):
        return repr(x)
    if isinstance(x, int):
        return str(x)
    if isinstance(x, float):
        if math.isinf(x):
            return "inf" if x > 0 else "-inf"
        if x == int(x):
            return str(int(x))
        return repr(round(x, 9))
    if isinstance(x, str):
        return repr(x)
    if isinstance(x, (list, _deque)):
        if len(x) > 400:
            return None
        return "[" + ", ".join(_canon(v, depth + 1) for v in x) + "]"
    if isinstance(x, tuple):
        return "(" + ", ".join(_canon(v, depth + 1) for v in x) + ("," if len(x) == 1 else "") + ")"
    if isinstance(x, (set, frozenset)):
        if len(x) > 400:
            return None
        items = sorted(_canon(v, depth + 1) for v in x)
        return "{" + ", ".join(items) + "}" if items else "set()"
    if isinstance(x, dict):
        if len(x) > 400:
            return None
        items = sorted(_canon(k, depth + 1) + ": " + _canon(v, depth + 1) for k, v in x.items())
        return "{" + ", ".join(items) + "}"
    if isinstance(x, (_types.ModuleType, _types.FunctionType, _types.BuiltinFunctionType, type, _types.MethodType)):
        return None
    if hasattr(x, "val") and (hasattr(x, "left") or hasattr(x, "right")):
        def tree(n, d):
            if n is None:
                return "-"
            if d > 12:
                return "…"
            return f"({_canon(n.val, 1)} {tree(getattr(n, 'left', None), d + 1)} {tree(getattr(n, 'right', None), d + 1)})"
        return "<tree " + tree(x, 0) + ">"
    if hasattr(x, "val") and hasattr(x, "next"):
        vals, n, seen = [], x, set()
        while n is not None and id(n) not in seen and len(vals) < 60:
            seen.add(id(n))
            vals.append(_canon(n.val, 1))
            n = getattr(n, "next", None)
        return "<list " + " -> ".join(vals) + (" -> cycle" if n is not None else "") + ">"
    if hasattr(x, "val"):
        return f"<node {_canon(getattr(x, 'val'), depth + 1)}>"
    return None


def _kind(x):
    if isinstance(x, bool):
        return "bool"
    if isinstance(x, (int, float)):
        return "number"
    if isinstance(x, str):
        return "string"
    if isinstance(x, (list, _deque)):
        return "list"
    if isinstance(x, tuple):
        return "tuple"
    if isinstance(x, (set, frozenset)):
        return "set"
    if isinstance(x, dict):
        return "dict"
    if x is None:
        return "None"
    if hasattr(x, "val"):
        return "node"
    return type(x).__name__


_SKIP = set()


def _snap(frame):
    out = {}
    for k, v in list(frame.f_locals.items()):
        if k.startswith("__") or k == "_" or k in _SKIP:
            continue
        c = _canon(v)
        if c is not None:
            out[k] = (c, v)
    return out


def _trace(fn, args, filename):
    """Run fn(*args) under a tracer. Returns (events, error, capped).
    Each event is (line, [(var, canon, kind, pretty)]): what that line changed. Returns show up as var '<return>'."""
    events = []
    state = {}
    count = [0]

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != filename or frame.f_code.co_name.startswith("<"):
            return None
        count[0] += 1
        if count[0] > _CAP:
            raise _Cap()
        fid = id(frame)
        if event == "call":
            snap = _snap(frame)
            # what the function starts with (its arguments and the outer names it sees) counts as made by its def line
            events.append((frame.f_code.co_firstlineno, [(k, c, _kind(v), _pretty(v)) for k, (c, v) in snap.items()]))
            state[fid] = (None, {k: c for k, (c, _) in snap.items()})
            return tracer
        if event not in ("line", "return"):
            return tracer
        prev_line, prev = state.get(fid, (None, {}))
        cur = _snap(frame)
        if prev_line is not None:
            produced = []
            for k, (c, v) in cur.items():
                if prev.get(k) != c:
                    produced.append((k, c, _kind(v), _pretty(v)))
            if event == "return":
                c = _canon(arg)
                if c is not None:
                    produced.append(("<return>", "return " + c, "return", "return " + _pretty(arg, 50)))
            events.append((prev_line, produced))
        state[fid] = (frame.f_lineno if event == "line" else None, {k: c for k, (c, _) in cur.items()})
        return tracer

    err = None
    capped = False
    old = sys.gettrace()
    sys.settrace(tracer)
    try:
        _LAST[0] = fn(*copy.deepcopy(args))
    except _Cap:
        capped = True
    except RecursionError:
        capped = True
    except Exception as e:  # noqa: BLE001
        tb = e.__traceback__
        line = None
        while tb:
            if tb.tb_frame.f_code.co_filename == filename:
                line = tb.tb_lineno
            tb = tb.tb_next
        err = (f"{type(e).__name__}: {e}", line)
    finally:
        sys.settrace(old)
    return events, err, capped


def _pretty(v, n=70):
    if isinstance(v, (set, frozenset)):
        s = "{" + ", ".join(repr(x) for x in sorted(v, key=lambda z: (str(type(z)), z) if not isinstance(z, (list, dict, set)) else (str(type(z)), str(z)))) + "}" if v else "set()"
    elif isinstance(v, dict):
        s = "{" + ", ".join(f"{k!r}: {w!r}" for k, w in v.items()) + "}"
    elif hasattr(v, "val") and hasattr(v, "next") and not isinstance(v, (int, float, str)):
        vals, cur = [], v
        while cur is not None and len(vals) < 8:
            vals.append(repr(cur.val)); cur = cur.next
        s = "list " + " → ".join(vals) + (" → …" if cur is not None else "")
    elif hasattr(v, "val") and not isinstance(v, (int, float, str)):
        s = f"a tree node {v.val!r} (left {getattr(getattr(v, 'left', None), 'val', None)!r}, right {getattr(getattr(v, 'right', None), 'val', None)!r})"
    else:
        try:
            s = repr(v)
        except Exception:  # noqa: BLE001
            s = type(v).__name__
    return s if len(s) <= n else s[: n - 1] + "…"


def _step_map(code):
    """line number -> step number, using the '# Step N' comments. Lines before any comment count as step 1."""
    lines = code.split("\n")
    m, cur, found = {}, 1, False
    for i, raw in enumerate(lines, 1):
        hit = _STEP_RE.search(raw)
        if hit and raw.strip().startswith("#"):
            cur = int(hit.group(1))
            found = True
            continue
        m[i] = cur
    return m, found


def _written(code, step_map, def_line):
    """step -> list of (line, text) of real code the user wrote under that step."""
    out = {}
    for i, raw in enumerate(code.split("\n"), 1):
        t = raw.strip()
        if i <= def_line or not t or t.startswith("#"):
            continue
        out.setdefault(step_map.get(i, 1), []).append((i, raw))
    return out


def _fill_empty_blocks(code):
    """Add 'pass' after a block opener with nothing under it yet, so a half written function still runs.
    It stays on the same line, so line numbers don't move."""
    lines = code.split("\n")
    def body(l):
        return l.split("#")[0].rstrip() if "#" in l and not ("'" in l or '"' in l) else l.rstrip()
    for i, raw in enumerate(lines):
        b = body(raw)
        if not b.strip().endswith(":"):
            continue
        ind = len(raw) - len(raw.lstrip())
        nxt = None
        for j in range(i + 1, len(lines)):
            t = lines[j].strip()
            if t and not t.startswith("#"):
                nxt = lines[j]
                break
        if nxt is None or len(nxt) - len(nxt.lstrip()) <= ind:
            lines[i] = b + " pass"
    return "\n".join(lines)


def _def_line(code, fname):
    for i, raw in enumerate(code.split("\n"), 1):
        if re.match(rf"\s*def\s+{fname}\s*\(", raw):
            return i
    return 0


INFO = {}  # canon -> (kind, pretty)


def _collect(code, filename, postlude, call, fname, tests):
    """Run every test under the tracer.
    Returns by_line[(line, var)][test] = [values in order], plus errors and endless loops."""
    import ast as _ast
    _SKIP.clear()
    for node in _ast.walk(_ast.parse(code)):
        if isinstance(node, _ast.comprehension):
            for t in _ast.walk(node.target):
                if isinstance(t, _ast.Name):
                    _SKIP.add(t.id)
    ns = {"__name__": "solution"}
    exec(compile(code, filename, "exec"), ns)
    if postlude:
        exec(compile(postlude, "helpers.py", "exec"), ns)
    fn = ns.get(call)
    if fn is None:
        raise NameError(f"{fname} is not defined. Keep the function name {fname}.")
    smap, found = _step_map(code)
    by_line, by_var, var_lines = {}, {}, {}
    results = []
    error = loop = None
    for ti, args in enumerate(tests):
        _LAST[0] = _NORESULT
        events, err, capped = _trace(fn, args, filename)
        results.append(_LAST[0])
        for line, produced in events:
            for var, c, k, p in produced:
                INFO.setdefault(c, (k, p))
                seq = by_line.setdefault((line, var), {}).setdefault(ti, [])
                if not seq or seq[-1] != c:
                    seq.append(c)
                vs = by_var.setdefault(var, {}).setdefault(ti, [])
                if not vs or vs[-1] != c:
                    vs.append(c)
                var_lines.setdefault(var, set()).add(line)
        if err and not error:
            error = {"msg": err[0], "line": err[1], "step": smap.get(err[1], 1) if err[1] else None, "test": ti}
        if capped and not loop:
            hot = {}
            for line, _ in events[-2000:]:
                hot[line] = hot.get(line, 0) + 1
            hl = max(hot, key=hot.get) if hot else None
            loop = {"line": hl, "step": smap.get(hl, 1) if hl else None, "test": ti}
    _RESULTS[0] = results
    return by_line, by_var, var_lines, error, loop, smap, found


def _subseq(need, have):
    """Every value the blueprint needs shows up in this variable at some point. Order is not required,
    so looping over a list instead of a set (different order) still counts."""
    hs = set(have)
    return all(n in hs for n in need)


def _prefix_hit(need, have):
    """How many values of need appear, in order, in have."""
    it, n = iter(have), 0
    for x in need:
        if any(h == x for h in it):
            n += 1
        else:
            break
    return n


def _merge(by_line, lines, var=None):
    """Join per line sequences into one per variable sequence, per test, keeping time order roughly by line visits."""
    out = {}
    for (ln, v), per_test in by_line.items():
        if ln not in lines or (var is not None and v != var):
            continue
        for t, seq in per_test.items():
            out.setdefault(v, {}).setdefault(t, []).extend(seq)
    return out


def _num(c):
    try:
        return float(c) if re.fullmatch(r"-?\d+(\.\d+)?", c) else None
    except Exception:  # noqa: BLE001
        return None


def _path(seq, n=5):
    if any(len(INFO.get(c, ("", c))[1]) > 25 for c in seq[:n]):
        n = 3
    ps = [_clip(INFO.get(c, ("", c))[1]) for c in seq[:n]]
    return " → ".join(ps) + (" → …" if len(seq) > n else "")


def _clip(t, n=36):
    return t if len(t) <= n else t[: n - 1] + "…"


def _short_args(a):
    s = ", ".join(repr(x) for x in a)
    return s if len(s) <= 60 else s[:59] + "…"


def _describe(c):
    k, p = INFO.get(c, ("", c))
    if k == "return":
        return p
    if k in ("number", "string", "bool", "None"):
        return f"the value {p}"
    if k == "node":
        return p
    return f"{'an' if k[:1] in 'aeiou' else 'a'} {k} like {p}"


def _diagnose(need, user_traj, test, args, prefer):
    """need: the values the blueprint's step makes for one variable on one test. Explain the closest miss.
    prefer: your variables changed by this step's own lines, tried first."""
    on = f"for input {_short_args(args)}"
    kind = INFO.get(need[0], ("", ""))[0]
    if kind == "return":
        rets = user_traj.get("<return>", {}).get(test, [])
        if not rets:
            return ("return", f"This step should {INFO[need[0]][1]} ({on}), but your code never reaches a return here. Is the return inside the right block, at the right indent?")
        return ("return", f"This step should {INFO[need[0]][1]} ({on}). Yours does {INFO.get(rets[0], ('', rets[0]))[1]}. Ask yourself: when exactly should the function stop, and what's the answer at that moment?")
    cands = []
    for var, per in user_traj.items():
        seq = per.get(test, [])
        if not seq or var == "<return>":
            continue
        kinds = {INFO.get(c, ("", ""))[0] for c in seq} - {"None"}
        if kind in kinds:
            seq = [c for c in seq if INFO.get(c, ("", ""))[0] == kind]
        cands.append((var in prefer, var, seq, kind if kind in kinds else next(iter(kinds), "None")))
    cands.sort(key=lambda c: not c[0])
    same = [(v, sq) for pr, v, sq, k in cands if k == kind]
    if not same or not any(pr for pr, v, sq, k in cands if k == kind):
        alt = {"set": ("list", "dict"), "list": ("set", "tuple"), "dict": ("list", "set"), "tuple": ("list",)}.get(kind, ())
        for pr, v, sq, k in cands:
            if k in alt and pr:
                why = {"set": "A set gives O(1) 'have I seen this?' checks and drops duplicates.", "dict": "A dict maps each key to a value, like number → index or letter → count.", "list": "A list keeps order and allows duplicates.", "tuple": "Lists can't be dict keys, tuples can."}.get(kind, "")
                return ("type", f"Your {v} is a {k}, but this step needs a {kind}, like {_clip(INFO[need[-1]][1], 60)} ({on}). {why}")
    if not same:
        return ("missing", f"This step should create {_describe(need[0])} ({on}), and nothing in yours does yet.")
    def score(sq):
        overlap = len(set(sq) & set(need))
        a, b = _num(sq[0]), _num(need[0])
        near = -abs(a - b) if a is not None and b is not None else 0
        return (overlap, near)
    pref = [(v, sq) for v, sq in same if v in prefer]
    var, seq = max(pref or same, key=lambda vs: score(vs[1]))
    if kind == "list":
        import ast as _ast
        try:
            last = _ast.literal_eval(seq[-1])
            if isinstance(last, list) and len(last) >= 2 and all(isinstance(x, list) for x in last) and last[0] and all(x == last[0] for x in last):
                return ("alias", f"Every inner list in your {var} changed together ({_clip(INFO[seq[-1]][1], 50)}). They are all the SAME list, which happens with [[]] * n. Build separate lists with [[] for _ in range(n)].")
        except Exception:  # noqa: BLE001
            pass
    if kind == "number":
        nn = [_num(c) for c in need]
        sn = [_num(c) for c in seq]
        close = min((x for x in sn if x is not None), key=lambda x: abs(x - nn[0]), default=None) if nn[0] is not None else None
        if len(nn) == 1 and close is not None and abs(close - nn[0]) == 1:
            return ("off1", f"Off by one: your {var} is {INFO.get(seq[sn.index(close)], ('', ''))[1]} here, but it should be {INFO[need[0]][1]} ({on}). Check the starting value, < versus <=, and that range(a, b) stops BEFORE b.")
        if len(nn) > 1 and len(nn) == len(sn) and None not in nn + sn and len({b - a for a, b in zip(nn, sn)}) == 1 and abs(sn[0] - nn[0]) == 1:
            return ("off1", f"Off by one: this step should go {_path(need)} ({on}), but your {var} goes {_path(seq)}. Every value is 1 off, so look at where it starts.")
    if len(need) == 1:
        return ("value", f"Your {var} ends up as {_clip(INFO.get(seq[-1], ('', seq[-1]))[1], 60)}, but this step should make {_clip(INFO[need[0]][1], 60)} ({on}). Walk the input through this step by hand and write down each value.")
    have = set(seq)
    i = next((k for k, c in enumerate(need) if c not in have), 0)
    if i == 0:
        return ("path", f"For input {_short_args(args)}, this step should produce {_path(need)}. Your {var} goes {_path(seq)} and never hits {_clip(INFO[need[0]][1], 40)}.")
    before = need[i - 1]
    j = seq.index(before) if before in seq else -1
    yours = INFO.get(seq[j + 1], ("", seq[j + 1]))[1] if 0 <= j < len(seq) - 1 else None
    tail = f"yours goes to {_clip(yours, 60)}" if yours else "yours stops changing there"
    return ("path", f"Trace it ({on}): both reach {_clip(INFO[before][1], 50)}, then the blueprint's next value is {_clip(INFO[need[i]][1], 50)} but {tail} (your {var}). That's the exact moment to look at.")


def _legacy_steps(payload):
    p = json.loads(payload)
    user, ref, fname, call, tests = p["user"], p["ref"], p["fname"], p["call"], p["tests"]
    postlude = p.get("postlude") or ""
    nsteps = p["nsteps"]
    run_code = _fill_empty_blocks(user)
    dl = _def_line(user, fname)

    try:
        compile(run_code, "solution.py", "exec")
    except SyntaxError as e:
        smap, _ = _step_map(user)
        return json.dumps({"syntax": {"msg": e.msg, "line": e.lineno, "step": smap.get(e.lineno or 0, 1)}})

    r_line, _, _, _, _, r_map, _ = _collect(ref, "reference.py", postlude, call, fname, tests)
    try:
        u_line, u_var, u_vlines, err, loop, u_map, found = _collect(run_code, "solution.py", postlude, call, fname, tests)
    except Exception as e:  # noqa: BLE001
        return json.dumps({"fatal": f"{type(e).__name__}: {e}"})

    written = _written(user, u_map, dl)
    ref_lines = {}
    for i, raw in enumerate(ref.split("\n"), 1):
        t = raw.strip()
        if not t or t.startswith("#") or t.startswith("def " + fname):
            continue
        ref_lines.setdefault(r_map.get(i, 1), []).append(i)
    def user_traj(upto):
        # variables touched in steps 1..upto, followed through the whole run in time order
        if not found:
            return u_var
        return {v: t for v, t in u_var.items() if any(u_map.get(ln, 1) <= upto for ln in u_vlines.get(v, ()))}

    def matched(need_by_test, traj):
        for t, need in need_by_test.items():
            if not need:
                continue
            if not any(_subseq(need, per.get(t, [])) for per in traj.values()):
                return False
        return True

    def_lines = {i for i, raw in enumerate(user.split("\n"), 1) if raw.strip().startswith("def ")}
    steps = []
    blocked = None
    for s in range(1, nsteps + 1):
        traj = user_traj(s)
        prefer = {v for v, lns in u_vlines.items() if any((u_map.get(ln, 1) == s or not found) and ln not in def_lines for ln in lns)}
        lines_out, fails = [], []
        for li in ref_lines.get(s, []):
            line_vars = [(v, per) for (ln, v), per in r_line.items() if ln == li]
            if not line_vars:
                lines_out.append({"status": "flow"})
                continue
            ok = True
            for v, per in line_vars:
                if not matched(per, traj):
                    ok = False
                    fails.append(per)
            first = next(iter(line_vars[0][1].values()))
            lines_out.append({"status": "ok" if ok else "miss", "what": _describe(first[0])})
        has_code = bool(written.get(s)) if found else bool(written)
        st = {"step": s, "written": has_code, "lines": lines_out}
        if err and err.get("step") == s and found:
            st["status"] = "error"
            st["error"] = err
        elif loop and loop.get("step") == s and found and fails:
            st["status"] = "loop"
            st["loop"] = loop
        elif not fails:
            real = any(l["status"] == "ok" and l.get("what") != "return None" for l in lines_out)
            st["status"] = "ok" if (has_code or not found or real) else "empty"
        elif not has_code:
            st["status"] = "empty"
        else:
            st["status"] = "wrong"
            reasons, cats = [], set()
            for per in fails:
                for t, need in sorted(per.items()):
                    if need and not any(_subseq(need, u.get(t, [])) for u in traj.values()):
                        cat, msg = _diagnose(need, traj, t, tests[t], prefer)
                        if cat not in cats:
                            cats.add(cat)
                            reasons.append(msg)
                        break
                if len(reasons) >= 2:
                    break
            st["why"] = reasons
        if blocked is not None and st["status"] in ("wrong", "empty", "loop", "error"):
            st["after"] = blocked
        if blocked is None and st["status"] in ("wrong", "loop", "error"):
            blocked = s
        steps.append(st)
    out = {"steps": steps, "commented": found}
    if err and (not found or not any(x.get("status") == "error" for x in steps)):
        out["error"] = err
    if loop:
        out["loop"] = loop
    return json.dumps(out)


# ───────────────────────── Step by step, in context ─────────────────────────
# A step can only be judged fairly when the steps around it exist. Example: "return True if it's
# already in the set" can't fire until a LATER step adds to the set. So each step is judged by
# running YOUR code for that step, the blueprint's code for every step you haven't written (or got
# wrong), and checking the whole thing against the tests. Blueprint names are renamed to yours.

import ast as _ast2, re as _re2


def _norm_out(x):
    return json.loads(json.dumps(x, default=lambda o: list(o) if isinstance(o, (set, tuple)) else repr(o)))


def _split(code):
    """-> (header lines, {step: (comment line, [body lines])}, order) using the '# Step N' comments."""
    lines = code.split("\n")
    header, regions, cur, order = [], {}, None, []
    for raw in lines:
        hit = _STEP_RE.search(raw)
        if hit and raw.strip().startswith("#"):
            cur = int(hit.group(1))
            regions[cur] = (raw, [])
            order.append(cur)
            continue
        if cur is None:
            header.append(raw)
        else:
            regions[cur][1].append(raw)
    return header, regions, order


def _code_lines(body):
    return [l for l in body if l.strip() and not l.strip().startswith("#")]


def _defs(code, smap, params):
    """Names each step creates, in order: assignments, loop variables, helper functions and their arguments."""
    out = {}
    try:
        tree = _ast2.parse(code)
    except SyntaxError:
        return out
    found = []
    methods = {id(b) for n in _ast2.walk(tree) if isinstance(n, _ast2.ClassDef) for b in n.body if isinstance(b, _ast2.FunctionDef)}
    for node in _ast2.walk(tree):
        names = []
        if isinstance(node, (_ast2.Assign, _ast2.AugAssign, _ast2.AnnAssign)):
            tg = node.targets if isinstance(node, _ast2.Assign) else [node.target]
            for t in tg:
                names += [n.id for n in _ast2.walk(t) if isinstance(n, _ast2.Name)]
        elif isinstance(node, (_ast2.For, _ast2.AsyncFor)):
            names += [n.id for n in _ast2.walk(node.target) if isinstance(n, _ast2.Name)]
        elif isinstance(node, _ast2.FunctionDef) and node.lineno > 1:
            # a method's name is part of the class's interface: never rename it
            names += ([] if id(node) in methods else [node.name]) + [a.arg for a in node.args.args if a.arg != "self"]
        elif isinstance(node, _ast2.Import):
            names += [(a.asname or a.name).split(".")[0] for a in node.names]
        elif isinstance(node, _ast2.ImportFrom):
            names += [a.asname or a.name for a in node.names]
        for nm in names:
            found.append((node.lineno, getattr(node, "col_offset", 0), nm))
    found.sort()
    seen = set(params)
    for ln, _, nm in found:
        if nm in seen or nm == "_" or nm in _SKIP:
            continue
        seen.add(nm)
        out.setdefault(smap.get(ln, 1), []).append(nm)
    return out


def _first_vals(by_var, name):
    per = by_var.get(name, {})
    return {t: seq[0] for t, seq in per.items() if seq}


def _mapping(r_defs, u_defs, r_var, u_var, u_names=frozenset()):
    """Blueprint name -> your name, matched step by step by what the variable first holds.
    A blueprint name you already use anywhere (even only reading it) stays as is."""
    m, used = {}, set()
    for names in r_defs.values():
        for r in names:
            if r in u_names:
                m[r] = r
                used.add(r)
    all_user = [n for s in sorted(u_defs) for n in u_defs[s]]
    for s in sorted(r_defs):
        for i, r in enumerate(r_defs[s]):
            if r in m:
                continue
            if r in all_user and r not in used:
                m[r] = r
                used.add(r)
                continue
            pool = [u for u in u_defs.get(s, []) if u not in used] or [u for u in all_user if u not in used]
            if not pool:
                continue
            rf = _first_vals(r_var, r)
            def score(u):
                uf = _first_vals(u_var, u)
                same = sum(1 for t, c in rf.items() if uf.get(t) == c)
                kind = sum(1 for t, c in rf.items() if t in uf and INFO.get(uf[t], ("",))[0] == INFO.get(c, ("",))[0])
                pos = -abs(u_defs.get(s, all_user).index(u) - i) if u in u_defs.get(s, []) else -9
                return (same, kind, pos)
            best = max(pool, key=score)
            if score(best)[0] or score(best)[1] or best in u_defs.get(s, []):
                m[r] = best
                used.add(best)
    return {k: v for k, v in m.items() if k != v}


def _rename(lines, m):
    if not m:
        return lines
    pat = _re2.compile(r"(?<![\w.])(" + "|".join(sorted(map(_re2.escape, m), key=len, reverse=True)) + r")\b")
    return [pat.sub(lambda g: m[g.group(1)], l) for l in lines]


def _compose(u_header, u_reg, r_reg, use_user, m, nsteps):
    """Your header, then for each step either your lines or the blueprint's (renamed). Returns code and line origins."""
    lines, origin = [], []
    for i, l in enumerate(u_header, 1):
        lines.append(l); origin.append(("u", i, 0))
    for s in range(1, nsteps + 1):
        if s in use_user and s in u_reg:
            cm, body, start = u_reg[s]
            lines.append(cm); origin.append(("u", start, s))
            for j, l in enumerate(body, 1):
                lines.append(l); origin.append(("u", start + j, s))
        else:
            cm, body = r_reg[s]
            lines.append(f"    # Step {s}")
            origin.append(("r", 0, s))
            for l in _rename(body, m):
                lines.append(l); origin.append(("r", 0, s))
    return "\n".join(lines) + "\n", origin


def _run_case(code, postlude, call, fname, tests, expected):
    """Run one composite. Returns (passed, by_line, by_var, var_lines, error, loop, results) or None if it doesn't compile."""
    try:
        compile(code, "solution.py", "exec")
    except SyntaxError:
        return None
    try:
        by_line, by_var, var_lines, err, loop, _, _ = _collect(code, "solution.py", postlude, call, fname, tests)
    except Exception as e:  # noqa: BLE001
        return (False, {}, {}, {}, {"msg": f"{type(e).__name__}: {e}", "line": None}, None, [])
    results = list(_RESULTS[0])
    ok = not err and not loop and len(results) == len(expected)
    if ok:
        for got, exp in zip(results, expected):
            if got is _NORESULT or _norm_out(got) != exp:
                ok = False
                break
    return (ok, by_line, by_var, var_lines, err, loop, results)


def pyforge_steps(payload):
    p = json.loads(payload)
    user, ref, fname, call, tests = p["user"], p["ref"], p["fname"], p["call"], p["tests"]
    expected = p.get("expected")
    nsteps = p["nsteps"]
    postlude = p.get("postlude") or ""

    u_header, u_regions, u_order = _split(user)
    r_header, r_regions, _ = _split(ref)
    if expected is None or sorted(u_order) != list(range(1, nsteps + 1)) or len(u_order) != nsteps:
        # step comments missing (blind pass): judge the whole thing by values
        run_code = _fill_empty_blocks(user)
        try:
            compile(run_code, "solution.py", "exec")
        except SyntaxError as e:
            smap, _ = _step_map(user)
            return json.dumps({"syntax": {"msg": e.msg, "line": e.lineno, "step": smap.get(e.lineno or 0, 1)}})
        return _legacy_steps(json.dumps(dict(p, user=run_code)))

    u_reg, ln = {}, len(u_header) + 1
    for s_ in u_order:
        cm, body = u_regions[s_]
        u_reg[s_] = (cm, body, ln)
        ln += 1 + len(body)
    written = {s_: bool(_code_lines(u_regions[s_][1])) for s_ in range(1, nsteps + 1)}

    def compose(use, m):
        code, origin = _compose(u_header, u_reg, r_regions, use, m, nsteps)
        return _fill_empty_blocks(code), origin

    # Your written steps, with the blueprint filling any step you haven't written, so skipping one is fine.
    base, b_origin = compose({x for x in written if written[x]}, {})
    try:
        compile(base, "solution.py", "exec")
    except SyntaxError as e:
        line = e.lineno or 1
        o = b_origin[min(len(b_origin), max(1, line)) - 1]
        if o[0] != "u":  # error surfaced in blueprint code: blame the closest line of yours above it
            o = next((b_origin[i] for i in range(min(len(b_origin), line) - 1, -1, -1) if b_origin[i][0] == "u"), ("u", 1, 1))
        return json.dumps({"syntax": {"msg": e.msg, "line": o[1], "step": o[2] or 1}})

    r_line, r_var, _, _, _, r_map, _ = _collect(ref, "reference.py", postlude, call, fname, tests)
    params = []
    m0 = _re2.match(r"\s*def\s+\w+\s*\((.*)\)", r_header[0] if r_header else "")
    if m0:
        params = [x.strip().split("=")[0].split(":")[0].strip() for x in m0.group(1).split(",") if x.strip()]
    try:
        _, u_var0, _, _, _, b_map, _ = _collect(base, "solution.py", postlude, call, fname, tests)
    except Exception:  # noqa: BLE001
        u_var0, b_map = {}, _step_map(base)[0]
    user_only = {i + 1 for i, o in enumerate(b_origin) if o[0] == "u"}
    u_defs_all = _defs(base, b_map, params)
    # keep only names your own lines create
    try:
        tree = _ast2.parse(base)
        mine, used_names = set(), set()
        for node in _ast2.walk(tree):
            if isinstance(node, _ast2.Name) and node.lineno in user_only:
                used_names.add(node.id)
            if getattr(node, "lineno", None) in user_only:
                for n in _ast2.walk(node):
                    if isinstance(n, _ast2.Name) and isinstance(n.ctx, _ast2.Store):
                        mine.add(n.id)
                if isinstance(node, _ast2.FunctionDef):
                    mine.add(node.name)
                    mine.update(a_.arg for a_ in node.args.args)
                if isinstance(node, (_ast2.Import, _ast2.ImportFrom)):
                    mine.update((a_.asname or a_.name).split(".")[0] for a_ in node.names)
    except SyntaxError:
        mine, used_names = set(), set()
    u_defs = {k: [n for n in v if n in mine] for k, v in u_defs_all.items()}
    r_defs = _defs(ref, r_map, params)
    mapping = _mapping(r_defs, u_defs, r_var, u_var0, used_names)
    # A blueprint name left as is must not collide with one of your names that now stands for something else.
    taken = set(mapping.values())
    for names in r_defs.values():
        for r in names:
            if r not in mapping and r in taken:
                mapping[r] = r + "_bp"

    ref_lines = {}
    for i, raw in enumerate(ref.split("\n"), 1):
        t = raw.strip()
        if not t or t.startswith("#") or t.startswith("def " + fname):
            continue
        ref_lines.setdefault(r_map.get(i, 1), []).append(i)

    good = set()  # steps judged right so far, kept as yours in later checks
    steps = []
    for s in range(1, nsteps + 1):
        st = {"step": s, "written": written[s], "lines": []}
        if not written[s]:
            st["status"] = "empty"
            for li in ref_lines.get(s, []):
                pers = [per for (l2, _v), per in r_line.items() if l2 == li]
                first = next((seq for per in pers for seq in per.values() if seq), None)
                st["lines"].append({"status": "miss", "what": _describe(first[0])} if first else {"status": "flow"})
            steps.append(st)
            continue
        use = good | {s}
        code_s, origin = compose(use, mapping)
        case = _run_case(code_s, postlude, call, fname, tests, expected)
        # If your step also does part of the next one, judge them together.
        k = s
        while case is not None and not case[0] and k + 1 <= nsteps and written.get(k + 1):
            k += 1
            alt_code, alt_origin = compose(good | {x for x in range(s, k + 1) if written[x]}, mapping)
            alt = _run_case(alt_code, postlude, call, fname, tests, expected)
            if alt and alt[0]:
                case, code_s, origin = alt, alt_code, alt_origin
                break
        if case is None:
            # your step plus the blueprint around it doesn't fit together (indentation etc.): fall back to values
            leg = json.loads(_legacy_steps(payload))
            ls = next((x for x in leg.get("steps", []) if x["step"] == s), None)
            if ls:
                ls.pop("after", None)
                st.update(ls)
            else:
                st["status"] = "wrong"
            if st["status"] == "ok":
                good.add(s)
            steps.append(st)
            continue

        ok, c_line, c_var, c_vlines, err, loop, results = case
        user_lines = {i + 1 for i, o in enumerate(origin) if o[0] == "u"}
        to_user = {i + 1: o[1] for i, o in enumerate(origin) if o[0] == "u"}
        traj = {v: t for v, t in c_var.items() if any(l in user_lines for l in c_vlines.get(v, ()))}
        prefer = {v for v, lns in c_vlines.items() if any(origin[l - 1][0] == "u" and origin[l - 1][2] == s for l in lns if 0 < l <= len(origin))}

        def matched(per):
            return all(not need or any(_subseq(need, u.get(t, [])) for u in traj.values()) for t, need in per.items())

        fails = []
        for li in ref_lines.get(s, []):
            line_vars = [(v, per) for (l2, v), per in r_line.items() if l2 == li]
            if not line_vars:
                st["lines"].append({"status": "flow"})
                continue
            okl = True
            for v, per in line_vars:
                if not matched(per):
                    okl = False
                    fails.append(per)
            first = next(iter(line_vars[0][1].values()))
            st["lines"].append({"status": "ok" if okl else "miss", "what": _describe(first[0])})

        if ok and not fails:
            st["status"] = "ok"
            good.add(s)
        else:
            in_step = lambda line: line and 0 < line <= len(origin) and origin[line - 1][0] == "u" and origin[line - 1][2] == s
            if err and in_step(err.get("line")):
                st["status"] = "error"
                st["error"] = {"msg": err["msg"], "line": to_user.get(err["line"])}
            elif loop and in_step(loop.get("line")):
                st["status"] = "loop"
                st["loop"] = {"line": to_user.get(loop["line"])}
            else:
                st["status"] = "wrong"
                reasons, cats = [], set()
                for per in fails:
                    for t, need in sorted(per.items()):
                        if need and not any(_subseq(need, u.get(t, [])) for u in traj.values()):
                            cat, msg = _diagnose(need, traj, t, tests[t], prefer)
                            if cat not in cats:
                                cats.add(cat)
                                reasons.append(msg)
                            break
                    if len(reasons) >= 2:
                        break
                if not reasons and err:
                    nm = _re2.search(r"name '(\w+)' is not defined", err["msg"])
                    if nm:
                        reasons.append(f"The next steps need something this step should create: {nm.group(1)} in the blueprint. Check this step makes every variable the plan needs.")
                    else:
                        reasons.append(f"With your step {s} in place, running the tests crashes: {err['msg']}.")
                if not reasons:
                    for t, (got, exp) in enumerate(zip(results, expected)):
                        g = None if got is _NORESULT else _norm_out(got)
                        if g != exp:
                            reasons.append(f"With your step {s} plugged into the rest of the plan, input {_short_args(tests[t])} gives {_clip(repr(g), 50)} instead of {_clip(repr(exp), 50)}. Trace that input through your lines for this step.")
                            break
                st["why"] = reasons
                st["cats"] = sorted(cats)
        steps.append(st)
    out = {"steps": steps, "commented": True}
    return json.dumps(out)


# ───────────────────────── Is it optimal? ─────────────────────────
import time as _time


def _grow(args, n):
    """Make the test input about n long: repeat flat lists and strings, keep numbers. None if it can't be grown."""
    out, grew = [], False
    for a in args:
        if isinstance(a, list) and a and all(isinstance(x, (int, float, str)) for x in a):
            k = n // len(a) + 1
            if all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in a):
                # keep values distinct-ish so dict/set solutions don't collapse
                out.append([x + i * 1000003 for i in range(k) for x in a][:n]); grew = True
            else:
                out.append((a * k)[:n]); grew = True
        elif isinstance(a, str) and a:
            out.append((a * (n // len(a) + 1))[:n]); grew = True
        else:
            out.append(a)
    return out if grew else None


def pyforge_perf(payload):
    """Times your solution against the blueprint's on a growing input. Slower by a lot means a worse time complexity."""
    p = json.loads(payload)
    call, tests, postlude = p["call"], p["tests"], p.get("postlude") or ""
    def load(src):
        ns = {"__name__": "solution"}
        exec(compile(src, "solution.py", "exec"), ns)
        if postlude:
            exec(compile(postlude, "helpers.py", "exec"), ns)
        return ns[call]
    try:
        ref, mine = load(p["ref"]), load(p["user"])
    except Exception as e:  # noqa: BLE001
        return json.dumps({"skip": f"{type(e).__name__}"})
    def clock(fn, args, budget):
        t0 = _time.perf_counter()
        try:
            fn(*copy.deepcopy(args))
        except Exception:  # noqa: BLE001
            return None
        return _time.perf_counter() - t0
    # pick the test that makes the blueprint work hardest (no early exit)
    best, bt = None, -1.0
    for t in tests:
        a = _grow(t, 2000)
        if a is None:
            continue
        tt = clock(ref, a, 1.0)
        if tt is not None and tt > bt:
            best, bt = t, tt
    if best is None:
        return json.dumps({"skip": "input can't be scaled"})
    base = best
    n, rt, args = 200, 0.0, None
    while n <= 40000:
        a = _grow(base, n)
        if a is None:
            return json.dumps({"skip": "input can't be scaled"})
        t = clock(ref, a, 1.0)
        if t is None:
            return json.dumps({"skip": "reference failed on scaled input"})
        args, rt = a, t
        if t > 0.008:
            break
        n *= 2
    ut = clock(mine, args, 3.0)
    if ut is None:
        return json.dumps({"skip": "your code failed on a bigger input"})
    # Growth: how much slower each one gets when the input is 4x bigger (N: ~4x, N log N: ~5x, N^2: ~16x)
    grow_slow = False
    if ut < 1.2:
        big = _grow(base, n * 4)
        rt4, ut4 = clock(ref, big, 2.0), clock(mine, big, 4.0)
        if rt4 and ut4:
            rg, ug = rt4 / max(rt, 1e-5), ut4 / max(ut, 1e-5)
            grow_slow = ug > 2.2 * rg and ug > 9
            n, rt, ut = n * 4, rt4, ut4
    ratio = ut / max(rt, 1e-4)
    return json.dumps({"n": n, "ref": round(rt, 4), "mine": round(ut, 4), "ratio": round(ratio, 1), "slow": (ratio > 8 and ut > 0.15) or grow_slow})

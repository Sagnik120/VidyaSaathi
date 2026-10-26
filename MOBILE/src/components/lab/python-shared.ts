/** What both Python runtimes (phone and web build) share. */

export const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

// Runs one test in a fresh namespace; returns [passed, shown value].
export const HARNESS = `
def _close(a, b):
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        return len(a) == len(b) and all(_close(x, y) for x, y in zip(a, b))
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        return abs(a - b) < 1e-6
    return a == b

def _run(src, call, expect):
    ns = {}
    try:
        exec(src, ns)
        got = eval(call, ns)
    except Exception as e:
        return [False, type(e).__name__ + ": " + str(e)]
    return [_close(got, eval(expect)), repr(got)]
`;

export type PythonHandle = {
  /** Loads the runtime (once). Rejects if it can't be fetched. */
  ready: () => Promise<void>;
  /** Runs `call` against the learner's `src`; resolves to [passed, the value it produced]. */
  run: (src: string, call: string, expect: string) => Promise<[boolean, string]>;
};

export const LOAD_FAILED = 'Could not load the Python runtime.';

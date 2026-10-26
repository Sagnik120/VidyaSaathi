/** Python for the code challenges in the web build: Pyodide loaded straight into the page, as the website does. */
import { useImperativeHandle, type Ref } from 'react';
import { HARNESS, LOAD_FAILED, PYODIDE_BASE, type PythonHandle } from './python-shared';

export type { PythonHandle } from './python-shared';

type Proxy = { toJs: () => [boolean, string]; destroy: () => void };
type Py = { runPython: (code: string) => unknown; globals: { get: (k: string) => unknown } };

let pyPromise: Promise<Py> | null = null;
function loadPy(): Promise<Py> {
  if (pyPromise) return pyPromise;
  pyPromise = new Promise<Py>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${PYODIDE_BASE}pyodide.js`;
    s.onload = () => (window as unknown as { loadPyodide: (o: object) => Promise<Py> }).loadPyodide({ indexURL: PYODIDE_BASE })
      .then((py) => { py.runPython(HARNESS); resolve(py); }, reject);
    s.onerror = () => reject(new Error(LOAD_FAILED));
    document.head.appendChild(s);
  }).catch((e) => { pyPromise = null; throw e; });
  return pyPromise;
}

export function PythonRuntime({ ref }: { ref: Ref<PythonHandle> }) {
  useImperativeHandle(ref, () => ({
    ready: async () => { await loadPy(); },
    run: async (src, call, expect) => {
      const py = await loadPy();
      const out = (py.globals.get('_run') as (s: string, c: string, e: string) => Proxy)(src, call, expect);
      const [ok, got] = out.toJs();
      out.destroy();
      return [ok, got];
    },
  }));
  return null;
}

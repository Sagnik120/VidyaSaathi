/**
 * Python for the code challenges, on a phone. The website runs the learner's
 * code in the browser with Pyodide (Python compiled to WebAssembly); a phone
 * has no browser page to do that in, so the same Pyodide runs inside an
 * invisible web view that is used purely as a sandboxed interpreter — it
 * draws nothing. Code never leaves the device.
 */
import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { HARNESS, LOAD_FAILED, PYODIDE_BASE, type PythonHandle } from './python-shared';

export type { PythonHandle } from './python-shared';

const PAGE = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<script src="${PYODIDE_BASE}pyodide.js"></script>
<script>
(function () {
  var send = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var py = null, seen = {};
  var boot = typeof loadPyodide === 'function'
    ? loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_BASE)} }).then(function (p) { p.runPython(${JSON.stringify(HARNESS)}); py = p; send({ type: 'ready' }); })
    : Promise.reject(new Error('runtime script did not load'));
  boot.catch(function (e) { send({ type: 'failed', message: String((e && e.message) || e) }); });
  function handle(raw) {
    var m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || m.type !== 'run' || seen[m.id]) return;
    seen[m.id] = true;
    boot.then(function () {
      try {
        var out = py.globals.get('_run')(m.src, m.call, m.expect);
        var js = out.toJs(); out.destroy();
        send({ type: 'result', id: m.id, ok: !!js[0], got: String(js[1]) });
      } catch (e) { send({ type: 'result', id: m.id, ok: false, got: String((e && e.message) || e) }); }
    }, function () { send({ type: 'result', id: m.id, ok: false, got: 'runtime unavailable' }); });
  }
  // Android delivers on document, iOS on window; ids make a double delivery harmless.
  document.addEventListener('message', function (e) { handle(e.data); });
  window.addEventListener('message', function (e) { handle(e.data); });
})();
</script></body></html>`;

const LOAD_TIMEOUT = 90_000;

type Waiter = { resolve: () => void; reject: (e: Error) => void };

export function PythonRuntime({ ref }: { ref: Ref<PythonHandle> }) {
  // The web view is created on first use, so opening the lab costs nothing.
  const [mounted, setMounted] = useState(false);
  const web = useRef<WebView>(null);
  const state = useRef<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const waiters = useRef<Waiter[]>([]);
  const pending = useRef(new Map<number, (r: [boolean, string]) => void>());
  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = (ok: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    state.current = ok ? 'ready' : 'failed';
    const list = waiters.current;
    waiters.current = [];
    list.forEach((w) => (ok ? w.resolve() : w.reject(new Error(LOAD_FAILED))));
    if (!ok) {
      pending.current.forEach((done) => done([false, LOAD_FAILED]));
      pending.current.clear();
      setMounted(false); // a later Run starts from a clean page
    }
  };

  const ready = () => new Promise<void>((resolve, reject) => {
    if (state.current === 'ready') return resolve();
    waiters.current.push({ resolve, reject });
    if (state.current === 'loading') return;
    state.current = 'loading';
    setMounted(true);
    timer.current = setTimeout(() => settle(false), LOAD_TIMEOUT);
  });

  useImperativeHandle(ref, () => ({
    ready,
    run: async (src, call, expect) => {
      await ready();
      return new Promise<[boolean, string]>((resolve) => {
        const id = nextId.current++;
        pending.current.set(id, resolve);
        web.current?.postMessage(JSON.stringify({ type: 'run', id, src, call, expect }));
      });
    },
  }));

  const onMessage = (e: WebViewMessageEvent) => {
    let m: { type?: string; id?: number; ok?: boolean; got?: string };
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.type === 'ready') settle(true);
    else if (m.type === 'failed') settle(false);
    else if (m.type === 'result' && m.id != null) {
      pending.current.get(m.id)?.([!!m.ok, m.got ?? '']);
      pending.current.delete(m.id);
    }
  };

  if (!mounted) return null;
  return (
    <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <WebView
        ref={web}
        originWhitelist={['*']}
        source={{ html: PAGE, baseUrl: 'https://cdn.jsdelivr.net/' }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        onError={() => settle(false)}
      />
    </View>
  );
}

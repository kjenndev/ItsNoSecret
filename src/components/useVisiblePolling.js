import { useCallback, useEffect, useRef } from 'react';
// A single in-flight read shared by the manual button and the polling timer.
export default function useVisiblePolling(load, interval = 30000) {
  const pending = useRef(null);
  const queued = useRef(null);
  const refresh = useCallback((invalidate = false) => {
    if (pending.current && invalidate !== true) return pending.current;
    if (queued.current) return queued.current;
    const previous = pending.current;
    // Chain immediately: even a settled read awaiting cleanup cannot absorb an
    // invalidation. Coalesce invalidations only until the queued read starts.
    const task = Promise.resolve(previous).catch(() => {}).then(() => {
      if (queued.current === task) queued.current = null;
      return load();
    }).finally(() => { if (pending.current === task) pending.current = null; });
    if (previous) queued.current = task;
    pending.current = task;
    return task;
  }, [load]);
  useEffect(() => {
    let stopped = false;
    let timer;
    const tick = async () => {
      if (!stopped && document.visibilityState !== 'hidden') await refresh();
      if (!stopped) { clearTimeout(timer); timer = setTimeout(tick, interval); }
    };
    // Wait for an older route read to settle before loading this route.
    const start = async () => { if (pending.current) await pending.current; if (!stopped) await tick(); };
    void start();
    const visible = () => { if (document.visibilityState !== 'hidden') { clearTimeout(timer); void tick(); } };
    document.addEventListener('visibilitychange', visible);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', visible); };
  }, [refresh, interval]);
  return refresh;
}

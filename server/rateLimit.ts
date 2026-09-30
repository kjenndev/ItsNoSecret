import type {RequestHandler} from 'express';
// Per-process backstop; deployments with multiple replicas should also rate-limit at the edge.
// Fail closed for new keys at capacity: evicting live buckets would allow a quota bypass.
export function rateLimit({limit = 10, windowMs = 15 * 60 * 1000, maxKeys = 10000, now = Date.now} = {}): RequestHandler {
  const buckets = new Map<string, {count: number; expires: number}>();
  let nextSweep = 0;
  return (req, res, next) => {
    const time = now();
    if (time >= nextSweep) {
      for (const [key, bucket] of buckets) if (bucket.expires <= time) buckets.delete(key);
      nextSweep = time + Math.min(windowMs, 60000);
    }
    // Do not trust client-supplied X-Forwarded-For; Express trust proxy is off by default.
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let bucket = buckets.get(key);
    if (bucket && bucket.expires <= time) {buckets.delete(key); bucket = undefined;}
    if (!bucket && buckets.size < maxKeys) {bucket = {count: 0, expires: time + windowMs}; buckets.set(key, bucket);}
    if (!bucket || bucket.count >= limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil(((bucket?.expires ?? nextSweep) - time) / 1000))));
      res.status(429).json({error: 'Too many requests; please try again later'}); return;
    }
    bucket.count += 1;
    next();
  };
}

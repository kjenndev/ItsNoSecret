// @vitest-environment node
import {it, expect, vi} from 'vitest';
import {rateLimit} from './rateLimit.ts';
it('caps memory without evicting live quotas and reclaims expired slots', () => {
 let time = 0;
 const limiter = rateLimit({limit: 1, maxKeys: 2, windowMs: 1000, now: () => time});
 const call = (ip: string) => {
   const next = vi.fn(); const res: any = {set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn()};
   limiter({ip} as any, res, next); return {next, res};
 };
 expect(call('a').next).toHaveBeenCalledOnce(); expect(call('b').next).toHaveBeenCalledOnce();
 expect(call('c').res.status).toHaveBeenCalledWith(429);
 expect(call('a').res.status).toHaveBeenCalledWith(429);
 time = 1001;
 expect(call('c').next).toHaveBeenCalledOnce(); expect(call('a').next).toHaveBeenCalledOnce();
});

// @vitest-environment node
import {expect,it,vi} from 'vitest';
const delivery=vi.hoisted(()=>vi.fn());vi.mock('./leadEmail.ts',()=>({deliverNextLeadEmail:delivery}));
it('runs sequentially, survives failures, and drains before stopping',async()=>{
 vi.useFakeTimers();const {startEmailWorker,stopEmailWorker}=await import('./emailWorker.ts');
 delivery.mockRejectedValueOnce(new Error('PRIVATE')).mockResolvedValue(false);
 startEmailWorker();startEmailWorker();await vi.advanceTimersByTimeAsync(1000);expect(delivery).toHaveBeenCalledTimes(1);
 await vi.advanceTimersByTimeAsync(1000);expect(delivery).toHaveBeenCalledTimes(2);
 let release:()=>void=()=>{};delivery.mockImplementationOnce(()=>new Promise<void>(r=>{release=r;}));
 await vi.advanceTimersByTimeAsync(1000);await vi.advanceTimersByTimeAsync(5000);expect(delivery).toHaveBeenCalledTimes(3);
 let stopped=false;const stop=stopEmailWorker().then(()=>{stopped=true;});await Promise.resolve();expect(stopped).toBe(false);release();await stop;
 await vi.advanceTimersByTimeAsync(5000);expect(delivery).toHaveBeenCalledTimes(3);vi.useRealTimers();
});

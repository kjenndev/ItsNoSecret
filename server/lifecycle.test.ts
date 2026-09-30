// @vitest-environment node
import {it, expect, vi} from 'vitest';
import {createServer} from 'node:http';
const db = vi.hoisted(() => ({prisma: {$disconnect: vi.fn()}, pool: {end: vi.fn()}}));
vi.mock('./db.ts', () => db);
const stop=vi.hoisted(()=>vi.fn());vi.mock('./emailWorker.ts',()=>({stopEmailWorker:stop}));
it('drains HTTP before disconnecting Prisma and closing the external pool', async () => {
 const {shutdown} = await import('./lifecycle.ts');
 const server = createServer((_req, res) => res.end('ok')).listen(0, '127.0.0.1');
 await new Promise<void>(r => server.on('listening', r));
 db.prisma.$disconnect.mockImplementation(async () => {expect(server.listening).toBe(false);});
 await shutdown(server);
 expect(stop).toHaveBeenCalledOnce();expect(stop.mock.invocationCallOrder[0]).toBeLessThan(db.prisma.$disconnect.mock.invocationCallOrder[0]);
 expect(db.prisma.$disconnect).toHaveBeenCalledOnce(); expect(db.pool.end).toHaveBeenCalledOnce();
 expect(db.prisma.$disconnect.mock.invocationCallOrder[0]).toBeLessThan(db.pool.end.mock.invocationCallOrder[0]);
});

// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
vi.mock('./db.ts', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe('JWT configuration', () => {
  for (const modulePath of ['./middleware/auth.ts', './routes/auth.ts']) {
    it.each([undefined, '', 'super-secret-key', 'a'.repeat(64), 'your-super-secret-key-that-is-at-least-32-characters', 'replace-me-with-a-random-secret-of-32-characters'])('rejects unsafe config %s in ' + modulePath, async (secret) => {
      vi.stubEnv('JWT_SECRET', secret);
      await expect(import(modulePath)).rejects.toThrow(/JWT_SECRET/);
    });
  }
  it('signs and verifies with the same configured key', async () => {
    vi.stubEnv('JWT_SECRET', randomBytes(32).toString('hex'));
    const { prisma } = await import('./db.ts');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'test-user', email: 'test@example.test', name: 'Test', roles: ['ADMIN'], tokenVersion: 3, isActive: true, passwordHash: await bcrypt.hash('test-password', 4) } as never);
    const { default: routes } = await import('./routes/auth.ts');
    const { authenticateToken } = await import('./middleware/auth.ts');
    const app = express();
    app.use(express.json());
    app.use(routes);
    app.get('/protected', authenticateToken, (_req, res) => res.json({ ok: true }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.on('listening', resolve));
    const address = server.address() as { port: number };
    const url = `http://127.0.0.1:${address.port}`;
    try {
      const response = await fetch(`${url}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.test', password: 'test-password' }) });
      expect(response.status).toBe(200);
      const { token } = await response.json();
      expect((await fetch(`${url}/protected`, { headers: { Authorization: `Bearer ${token}` } })).status).toBe(200);
      expect((await fetch(`${url}/protected`, { headers: { Authorization: `Bearer ${token}broken` } })).status).toBe(401);
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });
});

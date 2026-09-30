// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { seedUsers } from './seedUsers.ts';

function database(existing = false) {
  return { user: {
    findUnique: vi.fn(async ({ where }: { where: { email: string } }) => existing ? { id: where.email, email: where.email, passwordHash: 'preserve-this-hash' } : null),
    upsert: vi.fn(async ({ create }: { create: unknown }) => create),
  } };
}
describe('seed user credentials', () => {
  it.each([undefined, '', 'password123', 'tech123', 'a'.repeat(24), 'Example-Password-123!', 'a'.repeat(73)])('rejects missing or weak creation passwords (%s) before writing', async (password) => {
    const db = database();
    await expect(seedUsers(db as never, { SEED_ADMIN_PASSWORD: 'K8!vR2#xN9@pT6$q', SEED_TECH_PASSWORD: password })).rejects.toThrow(/SEED_TECH_PASSWORD/);
    expect(db.user.upsert).not.toHaveBeenCalled();
  });
  it('preserves existing accounts without requiring or hashing passwords', async () => {
    const db = database(true);
    const users = await seedUsers(db as never, {});
    expect(users.admin.passwordHash).toBe('preserve-this-hash');
    expect(users.tech.passwordHash).toBe('preserve-this-hash');
    expect(db.user.upsert).not.toHaveBeenCalled();
  });
  it('hashes explicit passwords and never updates an existing account on a race', async () => {
    const db = database();
    const env = { SEED_ADMIN_PASSWORD: 'K8!vR2#xN9@pT6$q', SEED_TECH_PASSWORD: 'D4&mZ7*eB1!sL9%w' };
    const users = await seedUsers(db as never, env);
    expect(await bcrypt.compare(env.SEED_ADMIN_PASSWORD, users.admin.passwordHash)).toBe(true);
    expect(await bcrypt.compare(env.SEED_TECH_PASSWORD, users.tech.passwordHash)).toBe(true);
    for (const [args] of db.user.upsert.mock.calls) expect(args).toMatchObject({ update: {} });
  });
});

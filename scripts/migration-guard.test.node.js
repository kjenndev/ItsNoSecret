import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import * as guard from './migration-guard.js';

test('refuses deployment when legacy role values could be destroyed', () => {
  assert.equal(typeof guard?.assertSafeMigration, 'function', 'migration safety guard must exist');
  assert.throws(() => guard.assertSafeMigration({ hasLegacyRole: true, hasUsers: true }), /owner-supervised.*preserv/i);
});

// DB/process boundaries are injected; no test connects to PostgreSQL or runs Prisma.
test('inspects legacy data read-only and never deploys an unsafe database', async () => {
  assert.equal(typeof guard?.runGuardedMigration, 'function', 'guarded runner must exist');
  const calls = [];
  const client = {
    async connect() { calls.push('connect'); },
    async query(sql, params) {
      calls.push([sql, params]);
      if (sql.includes('information_schema.columns')) return { rows: [{ exists: true }] };
      if (sql.includes('FROM "public"."User"')) return { rows: [{ exists: true }] };
      return { rows: [] };
    },
    async end() { calls.push('end'); },
  };
  let deployed = false;
  await assert.rejects(guard.runGuardedMigration({ client, schema: 'public', deploy: () => { deployed = true; } }), /owner-supervised/);
  assert.equal(deployed, false);
  assert.equal(calls.at(-1), 'end');
  assert.ok(calls.some(c => Array.isArray(c) && c[0] === 'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'));
});

test('fails closed if inspection does not return a boolean', async () => {
  let deployed = false;
  const client = { connect: async () => {}, end: async () => {}, query: async () => ({ rows: [{}] }) };
  await assert.rejects(guard.runGuardedMigration({ client, schema: 'public', deploy: () => { deployed = true; } }), /inspection/i);
  assert.equal(deployed, false);
});

test('migration CLI refuses missing credentials without leaking input', async () => {
  const { spawnSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./migrate-deploy.js', import.meta.url))], {
    cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, DATABASE_URL: '' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL is required/);
});

for (const [label, legacyRole, users] of [['empty legacy table', true, false], ['fresh or already migrated database', false, false]]) {
  test(`permits ${label} only after inspection connection closes`, async () => {
    let closed = false;
    let deployed = 0;
    const client = {
      async connect() {},
      async query(sql, params) {
        if (sql.includes('information_schema.columns')) {
          assert.deepEqual(params, ['tenant"name']);
          return { rows: [{ exists: legacyRole }] };
        }
        if (sql.includes('FROM "tenant""name"."User"')) return { rows: [{ exists: users }] };
        assert.ok(sql.startsWith('BEGIN ') || sql === 'COMMIT');
        return { rows: [] };
      },
      async end() { closed = true; },
    };
    const status = await guard.runGuardedMigration({ client, schema: 'tenant"name', deploy: () => {
      assert.equal(closed, true);
      deployed++;
      return 7;
    } });
    assert.equal(deployed, 1);
    assert.equal(status, 7, 'preserves Prisma failure status');
  });
}

for (const failure of ['connect', 'query', 'end']) {
  test(`fails closed on ${failure} error`, async () => {
    let deployed = false;
    let ended = false;
    const client = {
      async connect() { if (failure === 'connect') throw new Error('connection unavailable'); },
      async query() { if (failure === 'query') throw new Error('permission denied'); return { rows: [{ exists: false }] }; },
      async end() { ended = true; if (failure === 'end') throw new Error('close failed'); },
    };
    await assert.rejects(guard.runGuardedMigration({ client, schema: 'public', deploy: () => { deployed = true; } }));
    assert.equal(deployed, false);
    assert.equal(ended, true);
  });
}

test('migration CLI rejects malformed URL without disclosing it', async () => {
  const { spawnSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const input = 'invalid-connection-secret-not-for-output';
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./migrate-deploy.js', import.meta.url))], {
    cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, DATABASE_URL: input },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /deployment refused/);
  assert.equal((result.stdout + result.stderr).includes(input), false);
});

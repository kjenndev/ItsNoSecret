import 'dotenv/config';
import pg from 'pg';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runGuardedMigration } from './migration-guard.js';

// Never print connection errors: driver messages may contain credential material.
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required; migration deployment refused.');
  process.exitCode = 1;
} else {
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Unsupported database');
    const schema = url.searchParams.get('schema') || 'public';
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
    process.exitCode = await runGuardedMigration({
      client,
      schema,
      deploy() {
        const result = spawnSync(process.execPath, [fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url)), 'migrate', 'deploy'], {
          cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'inherit', env: process.env,
        });
        return result.status ?? 1;
      },
    });
  } catch {
    console.error('Migration deployment refused or inspection failed. Populated legacy User.role requires owner-supervised role preservation; see docs/operations.md. No automatic bypass is provided.');
    process.exitCode = 1;
  }
}

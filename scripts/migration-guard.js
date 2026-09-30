export function assertSafeMigration({ hasLegacyRole, hasUsers }) {
  if (hasLegacyRole && hasUsers) {
    throw new Error('Migration refused: populated legacy User.role requires owner-supervised role preservation before multi_roles can run. See docs/operations.md.');
  }
}

export async function runGuardedMigration({ client, schema, deploy }) {
  try {
    await client.connect();
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const columns = await client.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'User' AND column_name = 'role') AS exists`,
      [schema],
    );
    const hasLegacyRole = columns.rows[0].exists;
    if (typeof hasLegacyRole !== 'boolean') throw new Error('Migration inspection failed');
    let hasUsers = false;
    if (hasLegacyRole) {
      const quotedSchema = '"' + schema.replaceAll('"', '""') + '"';
      const users = await client.query(`SELECT EXISTS (SELECT 1 FROM ${quotedSchema}."User") AS exists`);
      hasUsers = users.rows[0].exists;
      if (typeof hasUsers !== 'boolean') throw new Error('Migration inspection failed');
    }
    assertSafeMigration({ hasLegacyRole, hasUsers });
    await client.query('COMMIT');
  } finally {
    await client.end();
  }
  return await deploy();
}

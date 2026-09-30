# Dependency remediation

The feature branch replaces unbounded `latest` dependency specifications with same-major ranges and updates the lockfile. Prisma CLI, client and PostgreSQL adapter are aligned at 7.10.0.

## Scoped overrides

Prisma 7.10.0 pins vulnerable transitive dependencies. Rather than force-downgrading the ORM or moving to a prerelease, this project temporarily overrides:

- `@prisma/config` → `deepmerge-ts` 8.0.2 (recursive-graph stack exhaustion: GHSA-ggr8-5vv4-36mx).
- `prisma` → `mysql2` 3.24.5 (credential downgrade and compressed-protocol DoS advisories).

These overrides must be reconsidered on each Prisma update. The deepmerge change crosses a major version; validation includes real Prisma config loading, client generation, schema validation, migration status and applying all existing migrations to an isolated empty PostgreSQL database. The temporary database is removed afterward. This application uses PostgreSQL; MySQL connectivity is not exercised or claimed supported by this verification.

## Verification

A clean `npm ci` succeeds. Both full and production-only npm audit report zero findings for this lockfile at the remediation checkpoint (24 before). An audit result is advisory coverage, not a complete application security review; rerun before deployment.

```sh
npm ci
npx prisma generate
npx prisma validate
npx prisma migrate status
npm test
npm run build
npm run lint
npm audit
npm audit --omit=dev
```

Supply your private environment before Prisma commands. Never run seeding or destructive migrations against an existing application database for verification. Local account/data preservation is checked separately from isolated migration tests.

The host's older npm audit-fix command failed internally (`edgesOut`). Remediation used an external npm11 installation, but the resulting lockfile was verified with the host's ordinary `npm ci`. No global toolchain replacement is required to run the application.

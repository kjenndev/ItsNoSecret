# Operations runbook

These are operator procedures, not evidence of a deployed production environment. This repository does **not** configure scheduled backups, retention, off-host storage, monitoring, alert delivery, TLS, or a production process supervisor. Assign owners and test each before public deployment. Never run migrations or seeds against an unconfirmed target.

## Runtime and release contract

Use Node 22.22.1+ in the 22.x line, or Node 24+; use a supported LTS line. The lockfile is authoritative. `tsx` is a runtime dependency; TypeScript and Prisma CLI are build/release dependencies. `npm start` runs `tsx server/index.ts`, not Vite and not a compiled backend bundle. Ship `server/`, generated `src/generated/prisma/`, the package manifests, and runtime dependencies. Do not ship secret files inside an artifact. Run the API with `NODE_ENV=production`, injected `DATABASE_URL`, a strong `JWT_SECRET`, and `PORT` (default 5000). The start command does not migrate, generate, seed, or serve `dist/`.

In an isolated release workspace, before exposing the release:

```bash
npm ci
npm run db:generate
npm run typecheck
npm run test:ops
npm test
npm run lint
npm run build
npm audit
# Only with owner approval, correct target, maintenance window, and verified backup:
npm run db:migrate:deploy
# Optional AFTER all build/release steps; Prisma CLI is needed for migrations above:
npm prune --omit=dev
NODE_ENV=production npm start
```

Generation does not apply migrations. Fix typecheck failures; do not exclude backend tests or disable strictness to pass the gate. `build` is frontend-only; it is not a substitute for `typecheck`. Keep the existing scoped dependency overrides until their replacement has been audited. If npm 9 crashes with `edgesOut` on this lockfile/overrides, use npm 11 externally rather than removing overrides or weakening the lockfile. In the current WSL workspace it is available as `node /home/kjenn/.local/share/npm-cli/node_modules/npm/bin/npm-cli.js`.

### Static frontend, reverse proxy, and CORS

Serve `dist/` with a production static server. Route `/api` (preserving that prefix) to the API port; use SPA fallback to `index.html` only for non-API paths. The Vite development proxy is not part of the production build. `npm run dev` and `npm run preview` are not production servers. The frontend assumes same-origin `/api` requests.

Terminate HTTPS at a reviewed reverse proxy; restrict direct access to the Node port (the API currently listens on all interfaces). Configure request size/rate limits, timeouts, security headers, and access-log redaction there. Do not log Authorization headers, passwords, or connection strings. Review Express proxy trust before relying on forwarded client addresses or implementing per-IP controls; this change does not configure it.

The backend currently uses permissive `cors()`; there is no application-level production origin allowlist. CORS is not authentication and does not stop direct HTTP clients. Use same-origin hosting and restrict browser origins at the edge, or add and test an explicit backend allowlist before supporting cross-origin clients. Do not assume setting an undocumented environment variable changes CORS.

### Health and readiness

`GET /api/health` is process liveness only. The coordinated backend hardening adds `GET /api/ready` for a database-backed readiness check (200 when ready; 503 otherwise). Verify that the deployed version actually exposes it before wiring probes; a 404 is not readiness. Require successful readiness before routing traffic, and remove an unready instance from traffic without treating a temporary database outage as proof the process needs a restart. These probes do not establish backup validity, migration safety, or whole-system correctness. No monitoring/alerts are enabled by this documentation.

## Migration safety: legacy single-role databases

**Use `npm run db:migrate:deploy`, not raw `prisma migrate deploy`, in the documented deployment path.** The wrapper performs read-only PostgreSQL inspection of the URL's `schema` parameter (default `public`) and refuses a populated `User` table that still has the legacy `role` column. Connection/inspection failures also refuse deployment. Empty/fresh and already-converted databases pass the check; Prisma remains responsible for normal migration history validation and deploy errors. Use the migration owner connection so metadata visibility is complete.

The historical `20260607014451_multi_roles` migration drops `User.role` and supplies an ADMIN array default. Applying it naively to legacy users loses their assigned roles and can grant administrator access. Do **not** rewrite the applied migration or its checksum, bypass the guard, or mark it applied without executing an equivalent reviewed schema change. This wrapper deliberately has no force flag, and it refuses even inconsistent states claiming the old migration was applied while populated legacy roles remain.

For a populated legacy database, stop here and arrange an **owner-supervised role-preserving upgrade**: take and restore-test a backup; securely preserve the exact user-ID-to-role mapping; design and rehearse a conversion on a disposable restored copy that maps each legacy role into the new roles array without blanket ADMIN grants; verify every user and authorization behavior; then have the owner approve the schema/migration-history reconciliation and recovery plan. This runbook intentionally does not provide an automatic resolve/bypass command. Changing a later default to TECHNICIAN does not repair roles already overwritten by the historical migration. If it was previously applied, compare roles with an authoritative pre-upgrade record and have the owner remediate any unintended grants.

Quiesce account writes and run only one approved migration job. Inspection completes before Prisma starts; it is not an atomic lock across both processes and cannot protect against concurrent writes creating legacy users after the check. The guard targets this known destructive transition, not every future destructive migration. Review every new migration and test it on a restored copy. Never auto-seed production.

## Backup and restore rehearsal (PostgreSQL)

Configure protected libpq service entries named `itsnosecret-production` and `itsnosecret-restore` outside the repository (for example `~/.pg_service.conf`, mode 0600); put credentials in an owner-readable `.pgpass`/`PGPASSFILE` (mode 0600), not command arguments or logs. Confirm host/database/user independently before every command. The restore service must point to a separately provisioned, **empty disposable database**, never production. Install PostgreSQL client tools compatible with the server version. The following commands are templates for an approved operator, not tasks this audit ran:

```bash
umask 077
BACKUP_DIR=/secure/backups/itsnosecret
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/itsnosecret-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --dbname='service=itsnosecret-production' --format=custom --file="$BACKUP_FILE"
pg_restore --list "$BACKUP_FILE" > "$BACKUP_FILE.contents"
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
# Set BACKUP_FILE to the approved archive when running this in another shell.
sha256sum --check "$BACKUP_FILE.sha256"
pg_restore --dbname='service=itsnosecret-restore' --exit-on-error --single-transaction \
  --no-owner --no-acl "$BACKUP_FILE"
```

Archive listing and checksum verification are not restore tests. After restoring, validate schema/migration history, row counts, user role assignments, customer/ticket relationships, and authorized application read/write paths against the disposable instance. Record the archive identifier, validation results, and measured restore time without including customer data or credentials in shared logs. Ensure production writes cannot reach the rehearsal database or vice versa. A logical dump does not include cluster roles or all infrastructure settings; preserve/recreate those separately under owner control. Do not restore over production as a test.

Backups contain credentials (including password hashes) and customer information: encrypt them, store an off-host copy, restrict access, define retention/deletion and recovery objectives, schedule backups and restore rehearsals, and alert on failure. Those controls remain operator work, **not configured by this change**.

## Product boundaries

Customer listing/creation and existing ticket/customer workflows are implemented, but full customer CRUD, customer archival, and archive/restore UI are **not currently supported**. Do not promise customer edit/delete/archive behavior or infer it from the earlier README wording. Implementing those features requires separate product approval and backend/frontend work.

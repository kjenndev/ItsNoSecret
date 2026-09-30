# Audit hardening validation

Branch: `feature/audit-hardening` (uncommitted). Verified 2026-09-30T03:57:20.432504+00:00.

## Implemented scope

- Current-account authorization, revocable JWT sessions, staff-only CRM access, safe account deactivation, and least-privilege account defaults.
- Private staff notes versus client-visible replies, with portal filtering and conservative migration of historical staff comments.
- Validation and optional-field normalization, staff-only ticket assignment, public lead allowlisting, request/body bounds and throttling.
- Transactional customer claims and administrator mutation safeguards; locked lead conversion and atomic conditional deletion.
- Bounded API pagination and truthful totals, paged selectors, race-safe page loading, draft preservation, post-mutation refresh, and mobile/keyboard navigation.
- Explicit production start, strict backend type checking, database-backed readiness, graceful shutdown, guarded migrations, and operations documentation.

## Verified results

- Clean `npm ci`, Prisma generation and validation: passed.
- `npm test`: **144 passed** across 12 files.
- `npm run test:ops`: **10 passed**.
- Type checking, lint, production frontend build, and `git diff --check`: passed.
- Full and production-only npm audits: **0 vulnerabilities** on the verified lockfile.
- Independent operational, backend, and frontend reviews: passed after fixing reported blockers. Backend/frontend reviewed runtime hashes matched the final source.
- Isolated PostgreSQL and real HTTP checks: **21 passed**, including actual occupied-customer rollback/concurrent claims, concurrent administrator removal, and a row-lock-controlled conversion-versus-delete race.
- Production `npm start` was exercised against the isolated database. Its owned database/process were removed afterward.
- Real Chromium tested customers, tickets, leads and users at 1440px and 390px, without viewport overflow or JavaScript exceptions. Mobile keyboard navigation passed. User Management settled at no more than two initial development-mode requests over three seconds, rather than its previous refetch loop.
- Owner-only backup restored into a disposable database; additive upgrade preserved all original row fields. A populated legacy-role database was refused before destructive migration.
- Local migration applied; original users, roles, password hashes, customer/ticket data, and credential/config files matched the pre-change snapshot. No live seeding or password reset.
- Final live Chromium rerun passed after restarting local services. Restored the absent detached WSL keep-alive; Windows frontend and readiness both returned HTTP 200 after 75 seconds without a WSL terminal session.

Local evidence: `~/.local/state/itsnosecret/hardening-final/`, `hardening-runtime-results.json`, `hardening-upgrade-results.json`, and preservation snapshots. Browser captures and isolated runner helpers are in the Windows Hermes cache, outside Git. Do not commit credential or database-backup files.

## Limits and rollout notes

Existing sessions without a session version must sign in again; passwords are unchanged. The lead-integrity migration refuses inconsistent historical conversion records rather than silently inventing customer links; inspect and repair those records under owner supervision before deploying to another populated database. Historical migration checksums are unchanged.

This is local validation, not approval for public exposure. Configure TLS, trusted proxy/edge rate limiting, monitoring and scheduled backups before an Internet deployment; the in-process limiter is not a distributed abuse-prevention service. Historical exposed credentials still require owner-managed rotation. Vite's large-chunk warning is non-blocking. Optional product expansion (invoicing, scheduling, SMS, customer archival) is not implemented in this fix pass.

# Resend lead notifications — verification

Branch: `feature/resend-lead-notifications`, based on `ce0e3e4`.

- Full Vitest suite: **171 passing tests**; operational suite: **10 passing tests**.
- TypeScript typecheck, ESLint, production frontend build, and whitespace check passed. The existing frontend chunk-size advisory remains.
- Dependency audit: **0 vulnerabilities**. This is not a public-deployment security certification.
- **22 disposable PostgreSQL/API/provider-contract scenarios passed** using the server's native `America/Chicago` timezone. No real Resend API requests were made.
- Verified ADMIN-only settings, encryption/masking, key preservation/clearing, validation, both lead creation paths, active-admin-only recipients, atomic queue creation, failure/retry handling, idempotency/frozen payloads, fresh-process queue recovery, demoted-recipient cancellation, concurrent workers, post-provider database failures, retry expiry, and graceful worker stop.
- Real database tests reproduced and resolved Prisma's unsupported `void` advisory-lock result and the UTC-naive timestamp comparison bug. Passing mocked tests alone did not establish correctness.
- Chromium verified the live settings page at 1440px and 390px, no horizontal overflow or uncaught JavaScript errors, and App settings anchored at the bottom of navigation. Mobile keyboard navigation passed.
- Browser settings writes used intercepted fixture responses, not live settings: initial network/JSON failure and retry, failed-save draft preservation, blank-key omission, replacement-key clearing, and technician route/navigation rejection passed.
- An owner-only pre-upgrade database backup was restored and upgraded in a disposable database; all existing records were preserved. The local additive migration was applied, and original records, roles, password hashes and configuration were compared unchanged. Only a new private encryption-key environment entry was added. No live seed or password reset occurred.

## Remaining account-level validation

Notifications are disabled until an administrator saves a real Resend API key and verified sender, then enables the feature. Actual provider authentication, domain verification, quotas and inbox delivery have **not** been tested. Enter credentials in App settings, not source control or chat. `SENT` means provider acceptance; webhook delivery/bounce tracking is not included.

## Evidence

Private local logs: `~/.local/state/itsnosecret/resend-final/`, `resend-qa-20260930T044236936746Z/`, `resend-upgrade-results.json`, and `resend-preserve-before.json` / `resend-preserve-after.json`. Chromium screenshots/results and the disposable integration runner are in the external Hermes cache. These private fixtures, backups and credentials are not repository artifacts.

See [setup and operational limits](resend-email.md).

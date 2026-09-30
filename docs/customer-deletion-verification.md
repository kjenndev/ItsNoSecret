# Customer deletion verification

Branch: `feature/admin-customer-deletion`, based on main `10e8747`.

- Full suite: **208 tests passed**.
- Operational suite: **10 tests passed**.
- Typecheck, lint, build, whitespace checks: passed.
- Dependency audit: zero reported vulnerabilities.
- Real PostgreSQL/API: **12 checks passed**, using an isolated disposable database with the full migration chain.
- Chromium: list confirmation/cancel, error/retry/success, detail deletion/navigation, technician visibility, desktop/mobile layout passed using intercepted mutation fixtures. No live customers were deleted.
- Independent reviews covered backend authorization/transaction scope, frontend lifecycle/accessibility, and follow-up migration and lead-history safeguards.

## Database evidence

Real API checks covered unauthenticated/non-admin rejection, missing and repeated deletion, complete ticket/comment cleanup, retained unlinked lead conversion history, unchanged users/passwords, and successful login after deletion. A failing database trigger proved full rollback. PostgreSQL lock barriers exercised deletion against ticket creation, comment creation, conversion, and another deletion. No orphaned records or partial changes remained. No provider calls were made.

The forward migration relaxes only the converted-customer link requirement while retaining the conversion timestamp invariant. Historical migrations were not edited. A private backup was restored into a separate database; guarded upgrade preserved all original rows, including email settings. The migration was then applied locally using `npm run db:migrate:deploy`, and API readiness passed. Original live users, customers, leads, tickets, comments, and private configuration were verified unchanged.

All destructive integration tests and restore rehearsals used disposable databases, which were removed. Browser success/error tests used fixtures; they do not establish production-browser or external-network performance. Existing backup retention and public deployment security remain separate concerns.

Changes are not committed or pushed by this verification process.

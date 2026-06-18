# QA Sign-off Report: Lead Management + Consultation Modal

Task: t_2e296f09
Project: It's No Secret Computer Services site/admin portal
Date: 2026-06-07
Tester: tester profile

## Result

FAIL / BLOCKED for QA sign-off.

The lead-management feature passes automated tests, lint, production build, Prisma generation/migration status, API smoke coverage, and core browser functional checks. However, the admin Leads page regresses the no-horizontal-overflow acceptance criterion at a 1280px desktop viewport.

## Blocking finding

1. Admin Leads page has horizontal document overflow on desktop.
   - URL: http://localhost:5173/admin/leads
   - Repro:
     1. Start app with `npm run dev`.
     2. Log in as admin@itsnosecret.com / password123.
     3. Navigate to `/admin/leads`.
     4. Evaluate `document.documentElement.scrollWidth > document.documentElement.clientWidth`.
   - Actual: `true`; measured `scrollWidth=1331`, `clientWidth=1265`.
   - Offenders from DOM inspection included MAIN/right edge 1331 and content containers/right edge 1299.
   - Expected: no page-level horizontal overflow per acceptance criteria.
   - Likely area: admin layout/content sizing around the fixed 240px Drawer and main content/table; `src/admin/AdminLayout.jsx` main container currently uses `flexGrow: 1, p: 4` without an explicit width/min-width constraint.

## Passing evidence

### Automated commands

- `npm test`
  - Exit code: 0
  - Result: 2 test files passed; 22 tests passed.
  - Notable tests included consultation modal payload validation/submission and admin lead edit/delete/convert endpoint calls.

- `npm run lint`
  - Exit code: 0
  - Result: `eslint .` passed.

- `npm run build`
  - Exit code: 0
  - Result: Vite build passed.
  - Note: existing warning remains: index JS chunk >500 kB after minification.

- `npx prisma generate`
  - Exit code: 0
  - Result: Prisma Client 7.8.0 generated to `./src/generated/prisma`.

- `npx prisma migrate status`
  - Exit code: 0
  - Result: PostgreSQL datasource `its_no_secret` at localhost:5432; 7 migrations found; database schema is up to date.

### API smoke command/result

A Python urllib smoke test against the local dev server verified:

- Public `POST /api/leads` validation rejects missing contact info with 400 and message `Enter an email or phone number so we can follow up.`
- Public consultation submit returns 201.
- Admin login returns 200.
- Admin `GET /api/crm/leads?q=<email>` finds the public lead.
- Admin `PUT /api/crm/leads/:id` edits lead fields/status.
- Admin `POST /api/crm/leads` creates an admin lead.
- Admin `DELETE /api/crm/leads/:id` deletes an unconverted lead with 204.
- Admin `POST /api/crm/leads/:id/convert` converts a lead to a customer with 201.
- Repeating convert is idempotent with 200 and `alreadyConverted: true`.
- Deleting a converted lead returns expected 409.

Smoke output lead/customer IDs:
- Lead: `c08d10d1-b044-4f0d-bbd5-33f3db7a2e7d`
- Customer: `a4210abe-dff0-4fae-9055-5381aeda446b`

### Manual/browser checks

- Homepage load: no browser console errors.
- Hero `Request a Free Consultation` button opens an accessible MUI dialog titled `Request a Free Consultation`.
- Empty submit leaves required full name/message fields invalid via browser validation.
- Valid modal submit showed success alert: `Thanks — your consultation request was sent. We will follow up soon.`
- Browser-submitted lead `qa-browser-modal-1780834200@example.com` appeared in admin API and admin Leads table with status `NEW`.
- Admin sidebar includes `Leads`; `/admin/leads` renders title, search/status filters, Add Lead button, and actions for Convert/Edit/Delete.
- Browser console on admin Leads page: no JS console messages/errors.

### Screenshot evidence files present

- `/home/ansibl/Code/its-no-secret-computer-services-site/qa-evidence/lead-management/homepage-consultation-modal-desktop.png`
- `/home/ansibl/Code/its-no-secret-computer-services-site/qa-evidence/lead-management/homepage-consultation-modal-mobile.png`
- `/home/ansibl/Code/its-no-secret-computer-services-site/qa-evidence/lead-management/admin-leads-page-desktop.png`
- `/home/ansibl/Code/its-no-secret-computer-services-site/qa-evidence/tester-lead-management/homepage-desktop-current.png`
- `/home/ansibl/Code/its-no-secret-computer-services-site/qa-evidence/tester-lead-management/homepage-mobile-current.png`

## Recommendation

Do not sign off until the admin Leads page has no page-level horizontal overflow. Suggested engineering fix: constrain the admin main content to viewport width minus drawer width and/or add `minWidth: 0`, `width: { sm: calc(100% - 240px) }`, and proper internal table overflow handling so the table scrolls inside its own container rather than expanding the document.

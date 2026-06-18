# Lead Management + Request Consultation Implementation Spec

Project: It's No Secret Computer Services site/admin portal
Task: t_253f5be0
Workspace: /home/ansibl/Code/its-no-secret-computer-services-site

## Goal

Add an end-to-end lead management flow without regressing the approved public marketing site or existing staff/client portal behavior:

- Public visitors click any "Request a Free Consultation" CTA and get a polished modal contact form instead of a plain `#contact` anchor jump.
- Submitted consultation requests create Lead records in the backend.
- Staff/admin users can view, create, edit, delete, and convert leads inside the admin portal.
- Converted leads create or link to Customer records without silently duplicating customers.

## Existing codebase anchors

Use these existing patterns rather than introducing a separate architecture:

- `prisma/schema.prisma`: currently has `Role`, `TicketStatus`, `TicketPriority`, `TicketType`, `User`, `Customer`, `Ticket`, `Comment`; add lead enums/model here.
- `server/index.ts`: mounts `/api/auth`, `/api/crm`, `/api/users`, `/api/portal`; mount public lead route here if split out.
- `server/routes/crm.ts`: authenticated CRM routes for customers/tickets/comments/users; add admin lead routes here or delegate to an authenticated `crm/leads` router.
- `src/App.jsx`: admin route tree; add `/admin/leads` route and import `AdminLeads`.
- `src/admin/AdminLayout.jsx`: staff sidebar; add a Leads item near Customers/Tickets.
- `src/admin/api.js`: use for authenticated admin fetches.
- `src/admin/AdminCustomers.jsx` and `src/admin/AdminTickets.jsx`: follow existing MUI `PageHeading`, `PolishedCard`, table/dialog patterns.
- `src/LandingPage.jsx`: contains `CtaButtons`; current "Request a Free Consultation" CTA is `Button component={Link} href="#contact"`; change this and any other matching CTA to open one shared modal.
- `package.json`: `npm test`, `npm run lint`, `npm run build`; Prisma v7 deps are present.

## Data model

Add Lead-specific enums and model in `prisma/schema.prisma`.

Recommended enums:

```prisma
enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  CONVERTED
  CLOSED
}

enum LeadSource {
  CONSULTATION_MODAL
  ADMIN_CREATED
  PHONE
  EMAIL
  REFERRAL
  OTHER
}

enum PreferredContact {
  EMAIL
  PHONE
  TEXT
  EITHER
}
```

Recommended model:

```prisma
model Lead {
  id                  String            @id @default(uuid())
  name                String
  email               String?
  phone               String?
  preferredContact    PreferredContact? @default(EITHER)
  serviceNeed         String?
  message             String
  source              LeadSource        @default(CONSULTATION_MODAL)
  status              LeadStatus        @default(NEW)
  notes               String?
  convertedCustomerId String?
  convertedCustomer   Customer?         @relation(fields: [convertedCustomerId], references: [id])
  convertedAt         DateTime?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([status, createdAt])
  @@index([email])
  @@index([phone])
}
```

Also add the back-reference on `Customer`:

```prisma
model Customer {
  ...
  leads Lead[]
  ...
}
```

Field rules:

- `name` required after trimming.
- At least one of `email` or `phone` required for public consultation submissions.
- `message` required for public submissions; admin-created leads may use a shorter message but should still store the request context.
- Normalize email to lowercase/trimmed before saving.
- Normalize empty strings to `null` for optional fields.
- `source` defaults to `CONSULTATION_MODAL` for public endpoint and `ADMIN_CREATED` for admin-created records.
- Converted records set `status=CONVERTED`, `convertedCustomerId`, and `convertedAt`; avoid editing conversion metadata manually from the generic edit dialog.

## Backend API design

### Public endpoint

Create a public unauthenticated endpoint for landing-page submissions. Prefer a separate route file so public and admin auth boundaries stay obvious:

- Create `server/routes/leads.ts` for public lead creation.
- In `server/index.ts`, mount `app.use('/api/leads', leadRoutes)` before/alongside authenticated routes.

Endpoint:

`POST /api/leads`

Request body:

```json
{
  "name": "Jane Visitor",
  "email": "jane@example.com",
  "phone": "210-555-0100",
  "preferredContact": "EMAIL",
  "serviceNeed": "Computer repair",
  "message": "Laptop will not start",
  "source": "CONSULTATION_MODAL"
}
```

Behavior:

- No bearer token required.
- Validate trimmed `name` and `message`.
- Require `email` or `phone`.
- Validate email format when email is supplied.
- Accept only allowed enum values; default `preferredContact` to `EITHER` and `source` to `CONSULTATION_MODAL`.
- Create Lead with `status=NEW`.
- Return `201` with a safe response, e.g. `{ id, status, createdAt }`; do not expose internal notes or unrelated CRM data.
- Return `400` with `{ error: "..." }` for validation failures.
- Log server-side errors only as needed; return generic `500` for unexpected failures.

### Authenticated admin endpoints

Put these under the authenticated CRM boundary, e.g. in `server/routes/crm.ts` after `router.use(authenticateToken)`:

- `GET /api/crm/leads`
  - Query params: optional `status`, `q`, `source`.
  - Return newest first.
  - Include converted customer summary when present: `{ id, name, email, phone }`.
- `POST /api/crm/leads`
  - Authenticated staff/admin creates a lead manually.
  - Same validation as public endpoint, but `source=ADMIN_CREATED` default.
- `GET /api/crm/leads/:id` if the UI needs a details route; optional for first release if table/edit dialog contains all fields.
- `PUT /api/crm/leads/:id`
  - Update contact/request/status/notes fields.
  - Do not clear `convertedCustomerId`/`convertedAt` through generic update.
  - If already converted, allow notes/status display but do not permit changing away from converted without explicit future requirement.
- `DELETE /api/crm/leads/:id`
  - Delete unconverted leads.
  - For converted leads, prefer returning `409` with a message like "Converted leads are linked to a customer and cannot be deleted" unless Kyle explicitly wants hard deletion.
- `POST /api/crm/leads/:id/convert`
  - Convert a lead to a customer/client.

### Convert-to-customer behavior

`POST /api/crm/leads/:id/convert` should be idempotent/safe:

1. Fetch lead by id.
2. If not found, return `404`.
3. If already converted and `convertedCustomerId` exists, return `200` with `{ lead, customer, alreadyConverted: true }`.
4. Try to find an existing Customer before creating one:
   - First by normalized lead email when present (`Customer.email` is unique).
   - If no email match and phone is present, optionally search by phone. Because phone is not unique, only auto-link when there is exactly one confident match; otherwise create a new customer or return a conflict requiring manual selection.
5. If an existing customer is found, link it and mark the lead converted.
6. If no existing customer is found, create one with:
   - `name` from lead name
   - `email` from normalized lead email
   - `phone` from lead phone
   - `address` left null/blank until staff fills it
7. Use a Prisma transaction so customer creation/linking and lead update succeed or fail together.
8. On unique-email race/conflict, refetch the customer by email and link it rather than creating a duplicate.
9. Return `200`/`201` with `{ lead, customer, createdCustomer: boolean, alreadyConverted: boolean }`.

Do not silently create duplicate customers for the same email. If duplicate detection is ambiguous, return `409` with a clear error and leave the lead unconverted.

## Admin UI behavior

### Navigation and route

- Add `AdminLeads.jsx` under `src/admin/`.
- Import and route it in `src/App.jsx` as `/admin/leads`.
- Add `Leads` to `src/admin/AdminLayout.jsx`, preferably between Customers and Tickets.
- Use an appropriate MUI icon such as `ContactMail`, `AssignmentInd`, or `PersonAddAlt`.

### Leads page layout

Use the current admin visual system:

- `PageHeading` eyebrow: `CRM`
- Title: `Leads`
- Body: `Review consultation requests and convert qualified leads into customers.`
- Primary action: `Add Lead`
- Wrapped in `PolishedCard` with table patterns similar to `AdminCustomers.jsx`.

Table columns:

- Name
- Contact (`email`, `phone`, preferred contact chip)
- Need / Message summary
- Source
- Status chip
- Created date
- Converted customer link/label when applicable
- Actions

Actions:

- Edit opens dialog prefilled with lead fields.
- Delete shows confirmation; after success refreshes list and shows a success alert/snackbar.
- Convert shows confirmation; after success refreshes list and displays created/linked customer feedback. If the customer id is returned, provide a link/button to `/admin/customers/:id` if details route is available.

Filters/search (useful but keep first version simple):

- Status filter: All, New, Contacted, Qualified, Converted, Closed.
- Search by name/email/phone/message if backend supports `q`.

Empty states:

- No leads: `No leads yet. Consultation requests from the homepage will appear here.`
- Filtered empty: `No leads match this filter.`

Status labels/colors:

- `NEW`: New, secondary/teal chip.
- `CONTACTED`: Contacted, info/blue chip.
- `QUALIFIED`: Qualified, warning/gold chip.
- `CONVERTED`: Converted, success/green chip.
- `CLOSED`: Closed, default/gray chip.

Admin form fields:

- Full name (required)
- Email
- Phone
- Preferred contact: Email, Phone, Text, Either
- Service need: select or text; recommended options mirror public services: Computer Repair, Malware Removal, Data Recovery Guidance, Custom PC Builds, Performance Tune-Ups, Small Business Support, Technology Training, Other
- Message / request details (required)
- Status (admin only)
- Internal notes (admin only)

UI states:

- Show loading spinner while fetching.
- Show inline `Alert` or snackbar for success/error states.
- Disable submit buttons while pending.
- Surface API errors without `alert()` if feasible; use MUI `Alert`/`Snackbar` for polish.
- Confirm destructive delete and conversion actions.

## Homepage modal UX

Implementation approach:

- Keep one `consultationOpen` state in `LandingPage`.
- Pass `onRequestConsultation` into `CtaButtons` and any other component/section with the same CTA.
- Replace only the "Request a Free Consultation" CTA behavior with a button click that calls `setConsultationOpen(true)`.
- Preserve `Call Now`, `Schedule Service`, hero layout, testimonial carousel, logo/hero, trust badges, and existing section anchors.
- Render one shared `RequestConsultationModal` component in `LandingPage` or as `src/components/RequestConsultationModal.jsx`.

Modal copy:

- Title: `Request a Free Consultation`
- Intro: `Tell us what is going on and the best way to reach you. We will review your request and follow up with practical next steps.`
- Success: `Thanks — your consultation request was sent. We will follow up soon.`
- Error fallback: `We could not send your request. Please try again or call (210) 658-6964.`

Public fields:

- Full name (required)
- Email address
- Phone number
- Preferred contact: Email, Phone, Text, Either
- What do you need help with? (service need select/text)
- Message / request details (required)

Validation:

- Full name required.
- Message/request details required.
- At least one of email or phone required.
- Email format validation when supplied.

Accessibility:

- MUI `Dialog` with clear `DialogTitle`.
- Autofocus first field.
- Escape and backdrop close allowed unless submitting.
- All fields have labels and helper/error text.
- Submit button has clear pending state.
- Success/error message is visible to screen readers via MUI alert semantics.
- Keyboard-only users can open, fill, submit, and close the modal.

Responsive behavior:

- `maxWidth="sm" fullWidth` dialog.
- On small screens, use compact spacing and full-width submit/cancel buttons if needed.
- Verify no horizontal overflow is introduced.

## Likely implementation sequence

1. Add Prisma enums/model and Customer relation.
2. Run the project-appropriate Prisma generate/migration flow for Prisma v7/Postgres.
   - Expected generate command is likely `npx prisma generate`.
   - Migration command depends on local DB availability; if DB is reachable use `npx prisma migrate dev --name add-leads`; otherwise create/check the migration SQL in the repo and document the blocker.
3. Add backend validation helpers for lead input.
4. Add public `POST /api/leads` route and mount it in `server/index.ts`.
5. Add authenticated `/api/crm/leads` CRUD endpoints.
6. Add `/api/crm/leads/:id/convert` with transaction/deduplication behavior.
7. Add frontend public consultation modal and wire all "Request a Free Consultation" CTAs.
8. Add `src/admin/AdminLeads.jsx`, route, and sidebar item.
9. Add/update automated tests.
10. Run verification and capture manual/browser screenshot evidence.

## Testing expectations for engineering

Automated tests should cover as much as the current harness allows:

- Public consultation modal opens from every "Request a Free Consultation" CTA rendered on the landing page.
- Modal validates required name/message and requires email or phone.
- Modal submits the expected JSON payload and shows success/error states.
- Admin route/sidebar renders Leads navigation.
- Admin Leads page fetches and displays leads.
- Admin edit/delete/convert actions call expected endpoints and refresh/display feedback.
- Backend validation rejects missing contact info and invalid enum/email data.
- Convert endpoint links by existing customer email instead of duplicating and marks lead converted.

Required commands before engineering handoff:

- `npm test`
- `npm run lint`
- `npm run build`
- `npx prisma generate`
- `npx prisma migrate dev --name add-leads` or documented migration/database blocker with the exact command output

Functional/manual evidence before QA:

- Browser screenshot/path for homepage consultation modal.
- Browser screenshot/path for admin Leads page.
- Evidence that a public modal submission creates a lead visible through admin API/UI.
- Evidence edit/delete/convert works or exact blocker if database/auth seed credentials prevent full flow.
- Browser console checked for errors.
- No horizontal overflow on desktop/mobile preview.

## QA acceptance criteria

QA should report PASS/FAIL/BLOCKED against these criteria:

1. Public homepage still preserves approved marketing visuals: logo/hero, trust badges, testimonial carousel, service sections, and current responsive polish.
2. Every "Request a Free Consultation" CTA opens the modal.
3. Modal has accessible labels, keyboard usability, validation, loading, success, and error states.
4. Successful modal submission creates a Lead record through the unauthenticated endpoint.
5. Admin sidebar includes Leads and `/admin/leads` renders for authenticated staff/admin users.
6. Admin can list leads and see contact details, request details, source, status, timestamps, and conversion state.
7. Admin can create/edit leads.
8. Admin can delete allowable leads with confirmation and clear feedback.
9. Admin can convert a lead to a customer/client.
10. Conversion avoids duplicate customer creation by email and handles already-converted/ambiguous conflicts gracefully.
11. Existing admin customers, tickets, users, client portal routes, auth flow, and public contact/phone CTAs are not regressed.
12. `npm test`, `npm run lint`, and `npm run build` pass.
13. Prisma generate/migration status is documented with exact output.
14. Browser/manual evidence includes homepage modal and admin Leads screenshots; console has no relevant errors.

## Dependency notes

- UI/UX design task `t_1784cf90` should refine exact modal/page copy and visual details before implementation begins.
- Engineering task `t_2c6555de` depends on this spec and UI/UX guidance.
- QA sign-off task `t_2e296f09` depends on engineering evidence and must complete before Kyle should consider the feature done.
- PM summary task `t_ecbbe5e3` should run only after QA to summarize migration/setup instructions, evidence, and any follow-ups.

## Out-of-scope for first release unless Kyle asks

- Lead assignment workflows.
- Email/SMS notifications.
- Full lead activity history/timeline.
- Bulk actions/export.
- Public captcha/anti-spam beyond basic validation/rate-limiting. If spam becomes a concern, add it as a follow-up.

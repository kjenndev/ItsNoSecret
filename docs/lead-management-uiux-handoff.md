# Lead Management + Consultation Modal UI/UX Handoff

Project: It's No Secret Computer Services site/admin portal
Task: t_1784cf90
Role: UI/UX design handoff for engineering task t_2c6555de

## Design goal

Add a low-friction lead capture flow that feels like a natural extension of the approved dark navy/teal marketing site and a practical admin Leads page that matches the current MUI staff portal patterns.

The experience should answer two jobs clearly:

1. Public visitor: "I need help. I want to ask for a free consultation without leaving the page or filling out a long form."
2. Staff/admin: "I need to quickly see new requests, follow up, edit details, delete mistakes, and convert qualified leads into customers."

Do not redesign the marketing site, hero, trust badges, testimonial carousel, admin navigation shell, customer pages, ticket pages, or client portal. This feature should be additive and visually consistent.

---

## Existing UI anchors to follow

Use the current codebase patterns already present in:

- `src/LandingPage.jsx`
  - Dark navy page, teal/cyan gradient accents, IBM Plex typography, polished cards, trusted local service tone.
  - `CtaButtons` currently renders Call Now, Schedule Service, and Request a Free Consultation.
- `src/components/Shared.jsx`
  - `PageHeading` and `PolishedCard` for admin surfaces.
- `src/admin/AdminCustomers.jsx`
  - Admin page shape: heading row, primary action, `PolishedCard`, MUI table, dialog form.
- `src/admin/AdminLayout.jsx`
  - Permanent drawer navigation and active selected styling.

Recommended icon for Leads navigation: `ContactMail` or `PersonAddAlt`, placed between Customers and Tickets.

---

## Public homepage consultation modal

### CTA behavior

All buttons with visible text "Request a Free Consultation" must open the same shared modal.

Implementation direction:

- Keep one `consultationOpen` state in `LandingPage`.
- Pass `onRequestConsultation` into `CtaButtons`.
- Change only the Request Consultation button from `component={Link} href="#contact"` to `onClick={onRequestConsultation}`.
- Preserve:
  - Call Now `tel:` CTA.
  - Schedule Service anchor behavior unless engineering intentionally wires it to the modal later.
  - Current hero, testimonial carousel, logo, trust badges, services, and contact sections.

Suggested `CtaButtons` prop shape:

```jsx
function CtaButtons({ stacked = false, onRequestConsultation }) {
  return (
    <Stack direction={{ xs: 'column', sm: stacked ? 'column' : 'row' }} spacing={1.5} sx={{ width: '100%' }}>
      <Button component={Link} href={phoneHref} variant="contained" startIcon={<PhoneInTalkIcon />} aria-label={`Call Now ${phoneDisplay}`}>
        Call Now {phoneDisplay}
      </Button>
      <Button component={Link} href="#contact" variant="outlined" endIcon={<ArrowForwardIcon />} aria-label="Schedule Service">
        Schedule Service
      </Button>
      <Button type="button" onClick={onRequestConsultation} variant="text" color="secondary" endIcon={<ArrowForwardIcon />} aria-label="Request a Free Consultation">
        Request a Free Consultation
      </Button>
    </Stack>
  );
}
```

### Modal component placement

Prefer a reusable component at:

- `src/components/RequestConsultationModal.jsx`

Render one instance near the bottom of `LandingPage`:

```jsx
<RequestConsultationModal
  open={consultationOpen}
  onClose={() => setConsultationOpen(false)}
/>
```

### Modal visual design

Use a MUI `Dialog` with:

- `maxWidth="sm"`
- `fullWidth`
- dark paper styling inherited from theme.
- a subtle teal/cyan accent strip or top border matching `PolishedCard`:
  - `borderTop: '3px solid rgba(46,230,166,.78)'`
  - optional gradient pseudo-element if easy.
- compact, premium spacing:
  - `DialogTitle`: 24-28px visual weight.
  - `DialogContent`: vertical form gap 2.
  - `DialogActions`: cancel + submit, stacked full-width on xs if needed.

Tone: trustworthy, practical, local. Avoid sales-heavy copy.

### Modal copy

Title:

- `Request a Free Consultation`

Intro/body under title:

- `Tell us what is going on and the best way to reach you. We will review your request and follow up with practical next steps.`

Success alert:

- `Thanks — your consultation request was sent. We will follow up soon.`

Error fallback:

- `We could not send your request. Please try again or call (210) 658-6964.`

Footer reassurance, small text below fields or above actions:

- `No pressure and no scare tactics — just a clear next step for your computer issue.`

### Public form fields

Recommended order:

1. Full name
   - Label: `Full name`
   - Required.
   - Auto-focus when modal opens.
   - Helper/error: `Please enter your name.`

2. Contact row: Email + Phone
   - Desktop: two columns.
   - Mobile: stacked.
   - Labels: `Email address`, `Phone number`.
   - Require at least one.
   - Shared helper when both empty: `Enter an email or phone number so we can follow up.`
   - Email-specific error: `Enter a valid email address.`

3. Preferred contact
   - Label: `Preferred contact`
   - Select options:
     - `Either is fine` -> `EITHER`
     - `Email` -> `EMAIL`
     - `Phone call` -> `PHONE`
     - `Text message` -> `TEXT`
   - Default: `EITHER`.

4. What do you need help with?
   - Label: `What do you need help with?`
   - Select options:
     - `Computer Repair`
     - `Malware Removal`
     - `Data Recovery Guidance`
     - `Custom PC Builds`
     - `Performance Tune-Ups`
     - `Small Business Support`
     - `Technology Training`
     - `Other`
   - Optional but useful for triage.

5. Message / request details
   - Label: `Message / request details`
   - Required.
   - Multiline, 4 rows.
   - Placeholder: `Briefly describe the computer issue, symptoms, or question you have.`
   - Error: `Please describe what you need help with.`

### Public form interaction states

Initial:

- Empty fields.
- Submit button label: `Send Consultation Request`.
- Cancel button label: `Cancel`.

Submitting:

- Disable all actions that would double-submit.
- Submit button label: `Sending...` with a small `CircularProgress` if easy.
- Keep backdrop/Escape close disabled while actively submitting, or allow close only after request settles.

Success:

- Show MUI `Alert severity="success"` inside dialog.
- Clear form after success.
- Change primary button to `Done` or close automatically after 1.2-1.8s. Prefer `Done` for user control.
- If the dialog remains open, do not show stale required-field errors.

Error:

- Show MUI `Alert severity="error"` inside dialog.
- Keep user-entered field values intact.
- Submit button returns to normal.
- If server returns a validation message, surface it in the alert and/or matching field helper text.

### Modal accessibility requirements

- Use MUI `DialogTitle` so the dialog has an accessible name.
- Add `aria-describedby` pointing to intro copy if practical.
- First field receives focus when opened.
- Keyboard-only user can open, tab through, submit, read errors, and close.
- Validation errors are displayed as field helper text and not only color.
- Success/error `Alert` is visible to screen readers via MUI semantics.
- Buttons have clear visible text; avoid icon-only controls in this modal.
- Honor reduced-motion preferences; do not add custom animation beyond MUI defaults.

### Public modal acceptance checks

- Every visible "Request a Free Consultation" CTA opens this modal.
- Call Now and Schedule Service keep their existing behavior.
- Required validation works without a page reload.
- At least one contact method is required.
- A successful submit calls `POST /api/leads` with trimmed values and shows success feedback.
- A failed submit shows an error without losing entered data.
- Desktop and mobile layouts do not overflow horizontally.
- Browser console has no new accessibility, React, or network-error noise after a normal successful submission.

---

## Admin Leads page

### Route and navigation

Add:

- Route: `/admin/leads`
- Component: `src/admin/AdminLeads.jsx`
- Sidebar label: `Leads`
- Sidebar placement: between `Customers` and `Tickets`.
- Icon: `ContactMail` preferred; `PersonAddAlt` acceptable.

Active selected state should match existing `AdminLayout` behavior.

### Page header

Use `PageHeading`:

- Eyebrow: `CRM`
- Title: `Leads`
- Body: `Review consultation requests and convert qualified leads into customers.`

Header action:

- Primary button: `Add Lead`
- Variant: `contained`
- Color: `secondary`, matching `AdminCustomers` action styling.

Header layout should match Customers page:

```jsx
<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-start', gap: 2 }}>
  <PageHeading eyebrow="CRM" title="Leads" body="Review consultation requests and convert qualified leads into customers." />
  <Button variant="contained" color="secondary" onClick={() => handleOpen()}>Add Lead</Button>
</Box>
```

On small screens, allow wrapping/stacking instead of squeezing the heading.

### Optional controls row

Keep the first implementation simple but useful:

- Search field label: `Search leads`
- Placeholder: `Name, email, phone, or message`
- Status filter label: `Status`
- Status options:
  - `All statuses`
  - `New`
  - `Contacted`
  - `Qualified`
  - `Converted`
  - `Closed`

Layout:

- Place controls inside the `PolishedCard` above the table or just above it in a compact `Stack`.
- Desktop: search flexes, status filter fixed around 180-220px.
- Mobile: stack full-width.

If engineering wants minimum scope, status filter alone is acceptable, but the table still needs a filtered empty state.

### Table layout

Use `PolishedCard sx={{ p: 0 }}` and MUI `TableContainer` like Customers.

Columns:

1. Name
2. Contact
3. Need / Request
4. Source
5. Status
6. Created
7. Converted Customer
8. Actions

Recommended display details:

#### Name column

- Primary: lead name, `Typography variant="subtitle2"`.
- Secondary: optional short ID or not needed. Keep clean.
- If row click is introduced later, make name teal and underlined on hover like Customers. For first release, action buttons are enough.

#### Contact column

Display as a compact vertical stack:

- Email or `No email`
- Phone or `No phone`
- Preferred contact chip below or beside:
  - `Email preferred`
  - `Phone preferred`
  - `Text preferred`
  - `Either preferred`

Do not hide phone/email behind an icon-only affordance; staff need scanability.

#### Need / Request column

- Top: `serviceNeed || 'General consultation'` as subtitle.
- Bottom: truncated message preview to ~90-120 characters.
- Use `title` attribute or tooltip only if easy; not required.
- Full message is editable/viewable in the dialog.

#### Source column

Labels:

- `CONSULTATION_MODAL` -> `Homepage`
- `ADMIN_CREATED` -> `Admin`
- `PHONE` -> `Phone`
- `EMAIL` -> `Email`
- `REFERRAL` -> `Referral`
- `OTHER` -> `Other`

Use small neutral chip or plain text. Status chip should be more visually prominent than source.

#### Status column

Use chips with clear color mapping:

- `NEW`: label `New`, color `secondary` / teal.
- `CONTACTED`: label `Contacted`, color `info` / blue.
- `QUALIFIED`: label `Qualified`, color `warning` / gold.
- `CONVERTED`: label `Converted`, color `success` / green.
- `CLOSED`: label `Closed`, color `default` / gray.

For converted leads, the chip should be visually stable and not look like an active action.

#### Created column

- Display localized short date, same pattern as Customers.
- If a time is easy, use `MMM d, yyyy h:mm a`; otherwise `toLocaleDateString()` is acceptable.

#### Converted Customer column

States:

- Not converted: `—`
- Converted with customer object/id: show `Customer: {name}` or button/link `View customer`.
- If route exists, link to `/admin/customers/:id`.
- If only ID is available, show `Converted` and rely on status chip.

#### Actions column

Use icon buttons with accessible labels/tooltips. Suggested order:

1. Convert
   - Icon: `PersonAddAlt` or `HowToReg`.
   - Button label/tooltip: `Convert to customer`.
   - Disabled when `status === 'CONVERTED'`.
2. Edit
   - Icon: `Edit`.
   - Label: `Edit lead`.
3. Delete
   - Icon: `Delete`.
   - Label: `Delete lead`.
   - Color: error.
   - Disabled or hidden for converted leads if backend blocks deletion.

Do not use raw `alert()` for action results. Use MUI `Snackbar` or inline `Alert`.

### Empty states

No leads at all:

- Title: `No leads yet`
- Body: `Consultation requests from the homepage will appear here. You can also add a lead manually.`
- Action: `Add Lead`

Filtered empty:

- Title/body: `No leads match this filter.`
- Secondary action: `Clear filters` if filters exist.

Place empty state inside the `PolishedCard`, centered with 32-48px vertical padding.

### Loading and error states

Loading:

- Use a centered `CircularProgress` inside page content, or skeleton table rows if simple.
- Avoid replacing the whole admin shell.

Fetch error:

- Use `Alert severity="error"` near the top of the page.
- Copy: `Failed to load leads. Please refresh or try again.`
- Include retry button if practical: `Retry`.

Action success messages:

- Add: `Lead added.`
- Edit: `Lead updated.`
- Delete: `Lead deleted.`
- Convert created new customer: `Lead converted to a new customer.`
- Convert linked existing customer: `Lead linked to an existing customer.`
- Already converted: `This lead was already converted.`

Action errors:

- Delete converted lead: `Converted leads are linked to customers and cannot be deleted.`
- Convert duplicate/ambiguous: `We found more than one possible customer match. Review the lead before converting.`
- Generic: `Action failed. Please try again.`

---

## Admin lead form dialog

Use one dialog for Add and Edit.

Dialog title:

- Add: `Add Lead`
- Edit: `Edit Lead`

Intro helper, optional under title:

- Add: `Create a lead from a phone call, email, referral, or walk-in request.`
- Edit: `Update contact details, request information, status, and internal notes.`

Fields:

1. Full name
   - Required.
   - Label: `Full name`.

2. Email address
   - Optional unless phone is empty.
   - Label: `Email address`.

3. Phone number
   - Optional unless email is empty.
   - Label: `Phone number`.

4. Preferred contact
   - Select.
   - Options: `Either is fine`, `Email`, `Phone call`, `Text message`.
   - Default: `EITHER`.

5. Service need
   - Select or text field.
   - Use the same service labels as public modal.

6. Message / request details
   - Required.
   - Multiline 3-4 rows.

7. Status
   - Admin only.
   - Select labels: `New`, `Contacted`, `Qualified`, `Converted`, `Closed`.
   - For converted leads, status can display `Converted` but should not allow manually changing away from Converted unless the backend explicitly supports rollback.

8. Internal notes
   - Admin only.
   - Multiline 3 rows.
   - Placeholder: `Follow-up attempts, context, or anything staff should know.`

9. Source
   - For add dialog: optional select defaulting to `ADMIN_CREATED`.
   - For edit dialog: show as read-only chip/text unless changing source is explicitly needed.

Validation mirrors public rules:

- Name required.
- Message required.
- Email or phone required.
- Valid email format if supplied.

Dialog actions:

- Cancel
- Add: `Add Lead`
- Edit: `Save Changes`

Pending state:

- Disable submit.
- Button label: `Saving...`.
- Do not close until successful.

---

## Delete confirmation

Use a MUI `Dialog`, not `window.confirm`, for polish and accessibility.

Title:

- `Delete lead?`

Body:

- `This will remove the lead for {name}. This cannot be undone.`

If converted lead deletion is disallowed:

- Disable delete action and tooltip: `Converted leads are linked to customers and cannot be deleted.`
- If user somehow triggers delete, show error alert from backend.

Actions:

- Cancel
- Delete Lead, `color="error"`, pending label `Deleting...`

After success:

- Refresh list.
- Show snackbar `Lead deleted.`

---

## Convert-to-customer confirmation

Use a MUI `Dialog` so staff understand the side effect.

Title:

- `Convert lead to customer?`

Body:

- `This will create or link a customer record for {name} and mark the lead as converted.`

Secondary explanatory text:

- `If a customer with the same email already exists, the lead should link to that customer instead of creating a duplicate.`

Actions:

- Cancel
- Convert to Customer, `variant="contained"`, `color="secondary"`
- Pending label: `Converting...`

After success:

- Refresh leads.
- Show snackbar based on API response:
  - `createdCustomer === true`: `Lead converted to a new customer.`
  - `createdCustomer === false`: `Lead linked to an existing customer.`
  - `alreadyConverted === true`: `This lead was already converted.`
- If `customer.id` is returned, snackbar action/button can be `View customer` linking to `/admin/customers/{id}`.

---

## Visual hierarchy and spacing

Admin page:

- Keep `PageHeading` top margin/spacing consistent with existing pages.
- Put filters close to the table so staff see them as table controls.
- Table cells should be denser than marketing cards but not cramped.
- Long message previews should truncate/wrap to 2 lines max to preserve scanability.
- Status/Source chips should be small enough not to dominate names/contact details.

Modal:

- Keep modal narrow and fast: no unnecessary sections, no giant header illustration.
- One reassurance line is enough.
- Public modal should not feel like a support ticket form; keep it framed as a consultation request.

Colors:

- Preserve dark navy base and teal/cyan accents.
- Use teal for primary consultation/lead actions.
- Use error red only for delete/destructive confirmations.
- Use success green only after conversion/submission success.

---

## Implementation-ready label map

Status labels:

```js
const leadStatusLabels = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CONVERTED: 'Converted',
  CLOSED: 'Closed',
};
```

Preferred contact labels:

```js
const preferredContactLabels = {
  EITHER: 'Either is fine',
  EMAIL: 'Email',
  PHONE: 'Phone call',
  TEXT: 'Text message',
};
```

Source labels:

```js
const leadSourceLabels = {
  CONSULTATION_MODAL: 'Homepage',
  ADMIN_CREATED: 'Admin',
  PHONE: 'Phone',
  EMAIL: 'Email',
  REFERRAL: 'Referral',
  OTHER: 'Other',
};
```

Service need labels:

```js
const serviceNeedOptions = [
  'Computer Repair',
  'Malware Removal',
  'Data Recovery Guidance',
  'Custom PC Builds',
  'Performance Tune-Ups',
  'Small Business Support',
  'Technology Training',
  'Other',
];
```

---

## Engineering acceptance criteria for this UI/UX handoff

Public modal:

1. Every "Request a Free Consultation" CTA opens the shared modal.
2. Modal matches the approved dark navy/teal visual system and does not alter approved homepage sections.
3. Form fields, labels, helper text, validation, pending, success, and error states match this handoff.
4. Successful submission posts to `POST /api/leads` and creates a lead visible to admins.
5. Call Now, Schedule Service, testimonial carousel, logo/hero, trust badges, and responsive layout remain intact.
6. Modal is keyboard accessible, screen-reader labeled, and mobile-safe.

Admin Leads:

1. Sidebar includes Leads between Customers and Tickets.
2. `/admin/leads` uses `PageHeading`, `PolishedCard`, MUI table/dialog patterns consistent with Customers/Tickets.
3. Leads table shows name, contact, need/request preview, source, status, created date, conversion state, and actions.
4. Add/Edit dialog supports all defined fields and validation.
5. Delete uses confirmation and clear feedback.
6. Convert uses confirmation and clear created/linked/already-converted feedback.
7. Empty, filtered-empty, loading, fetch-error, and action-error states are implemented.
8. Existing admin Customers/Tickets/Users and client portal behavior are not regressed.

QA evidence expected after implementation:

- Screenshot of homepage modal on desktop.
- Screenshot of homepage modal on mobile or responsive narrow viewport.
- Screenshot of admin Leads table with at least one lead.
- Evidence that a modal submission appears in admin Leads.
- Evidence that edit/delete/convert actions work or exact blocker if DB/auth prevents full flow.
- `npm test`, `npm run lint`, `npm run build`, and Prisma generate/migration status documented by engineering.

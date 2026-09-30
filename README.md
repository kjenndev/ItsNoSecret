# It’s No Secret Computer Services Management Platform

A professional, high-fidelity full-stack platform for managing computer service diagnostics, repairs, and customer relationships. This application consists of a public-facing landing page, a Staff Admin Portal (CRM/Ticketing), and a Client Service Portal.

## 🚀 Features

### Public Landing Page
- High-fidelity dark mode aesthetic with radial gradients.
- Comprehensive service showcase and customer testimonials.
- Unified entry point for staff and clients via the `/login` route.

### Staff Admin Portal (`/admin`)
- **CRM Dashboard**: Unified view of total customers and active service requests.
- **Customer Management**: Customer listing/creation and existing ticket/customer workflows. Full customer CRUD and customer archival/archive-restore are not currently supported.
- **Ticket Management**: A robust ticketing system with statuses (Open, In Progress, Resolved, Closed), priorities (Low to Urgent), and service types (PC Repair, Data Recovery, etc.).
- **Technician Collaboration**: Ability to assign tickets to specific staff members and maintain internal discussion threads via comments.
- **User Management**: Administrators can manage staff accounts, assign multiple roles, and link client users to CRM profiles.

### Client Service Portal (`/portal`)
- **Personal Dashboard**: Clients can see the real-time status of their own service requests.
- **Self-Service Ticketing**: Simple form for clients to submit new repair or diagnostic requests.
- **Direct Communication**: Clients can post comments on their tickets to communicate directly with their assigned technician.

---

## 🛠 Technology Stack

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **UI Framework**: [Material UI (MUI)](https://mui.com/) with a custom high-fidelity theme.
- **Backend**: [Express.js](https://expressjs.com/) (Node.js)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM & Migrations**: [Prisma 7](https://www.prisma.io/)
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password hashing.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 22.22.1+ (22.x) or 24+; use a supported LTS line
- PostgreSQL (installed and running locally)

### 1. Clone the repository
```bash
git clone <repository-url>
cd its-no-secret-computer-services-site
```

### 2. Install dependencies
```bash
npm ci
```

### 3. Environment Configuration
For a **new** local setup, copy `.env.example` to `.env` and fill in your database credentials. Do not overwrite an existing environment file. `.env` and `.env.*` overrides are ignored; only the empty/safe template belongs in Git. Production should inject credentials through a secret manager or an owner-readable external environment file, never a committed file. Never prefix server secrets with `VITE_` (Vite exposes those to browsers).

Generate `JWT_SECRET` locally using a cryptographic random source:
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```
Store the output securely, not in source control or shared logs. The API refuses to start with a missing, short, low-diversity, or recognizable example/default secret. Signing and verification share one validated configuration. Use at least 32 random bytes (the command yields a 64-character hex value); validation rejects values shorter than 32 UTF-8 bytes or with fewer than 8 distinct characters, but cannot prove randomness. Prisma generation and frontend builds do not require JWT configuration.

**Previously committed secrets remain exposed in Git history.** Removing `.env` from the index does not revoke credentials or erase old commits/clones. The credential owner must rotate any exposed database password and JWT signing secret in each affected environment, invalidate existing sessions/tokens, and replace any accounts still using old seed defaults. Rotation is an operational task, not performed by this code change. Coordinate any separately approved history cleanup with collaborators; rewriting history alone cannot make an exposed secret safe.

### 4. Database Initialization
After confirming the target database, generate the client and use the guarded migration command. A populated legacy single-role database requires an owner-supervised role-preserving upgrade; see [Operations](docs/operations.md). Never rewrite old migration checksums:
```bash
npm run db:generate
npm run db:migrate:deploy
```

### 5. Seed the Database
**Optional: disposable development databases only.** Seeding adds sample tickets again on repeated runs; do not run it against a live database or as an automatic deployment step.

Set `SEED_ADMIN_PASSWORD` and `SEED_TECH_PASSWORD` through your local environment/secret manager before creating the corresponding users. Use distinct, password-manager-generated values: at least 16 characters, at most 72 UTF-8 bytes (bcrypt limit), at least 10 distinct characters, no surrounding whitespace, defaults, or example/password placeholders. There are no built-in seed passwords. Both needed credentials are validated before user writes. Existing users are returned unchanged, without requiring seed passwords; even a concurrent create cannot reset their passwords (`update: {}`). Seeding is **not** a password rotation mechanism.

After confirming the target is an authorized disposable database:
```bash
npm run seed
```

### 6. Run the Application
Start both the frontend (Vite) and backend (Express) concurrently:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## 📦 Deployment Dependencies

When deploying to a production environment (e.g., Heroku, Render, AWS), ensure the following:

### Infrastructure Requirements
- **Node.js Environment**: The server is built to run on Node.js.
- **PostgreSQL Database**: A production-grade PostgreSQL instance.

### Environment Variables (Required)
- `DATABASE_URL`: Connection string for your production database.
- `JWT_SECRET`: Required cryptographically random signing secret; see Environment Configuration above. Missing/unsafe values prevent API startup.
- `NODE_ENV`: Should be set to `production`.
- `PORT`: The port the Express server will listen on (defaulting to 5000).

### Build, start, and operations

Follow the [production operations runbook](docs/operations.md) for the release gates, guarded migration procedure, backup/restore rehearsal, proxy/CORS limitations, and readiness checks. No backups, alerts, or production supervisor are configured by that documentation.

- `npm ci` then `npm run db:generate` prepares dependencies and the generated Prisma client.
- `npm run typecheck`, `npm run test:ops`, `npm test`, `npm run lint`, and `npm run build` are separate release checks. The build only produces frontend assets.
- `npm run db:migrate:deploy` inspects legacy role safety before invoking Prisma; migrations require owner approval and a verified backup.
- `NODE_ENV=production npm start` runs the Express TypeScript backend through runtime `tsx`; it neither serves `dist/` nor generates/migrates/seeds the database.
- Serve `dist/` separately and reverse-proxy same-origin `/api` to Express. Vite's development proxy is not shipped in `dist/`. Backend CORS is currently permissive and requires production review.

---

## 📝 Scripts Summary

- `npm run dev`: Runs frontend and backend concurrently in development mode.
- `npm run build`: Compiles the React frontend for production.
- `npm run lint`: Runs ESLint for JavaScript/JSX code quality checks.
- `npm run typecheck`: Strict backend TypeScript no-emit gate (including backend tests and Prisma tooling).
- `npm run test:ops`: Runs isolated migration-guard tests without a database.
- `npm start`: Starts the API through runtime `tsx`.
- `npm run db:migrate:deploy`: Runs the guarded migration deployment path.
- `npm run seed`: Executes the Prisma seed script.
- `npx prisma studio`: Opens a visual GUI to manage your database data.

## Lead notification email

Admins can configure Resend in **App settings → Email**, at the bottom of the staff navigation. Notifications for new public/staff leads are disabled until configured. See [Resend email setup and secret management](docs/resend-email.md).

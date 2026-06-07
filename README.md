# It’s No Secret Computer Services Management Platform

A professional, high-fidelity full-stack platform for managing computer service diagnostics, repairs, and customer relationships. This application consists of a public-facing landing page, a Staff Admin Portal (CRM/Ticketing), and a Client Service Portal.

## 🚀 Features

### Public Landing Page
- High-fidelity dark mode aesthetic with radial gradients.
- Comprehensive service showcase and customer testimonials.
- Unified entry point for staff and clients via the `/login` route.

### Staff Admin Portal (`/admin`)
- **CRM Dashboard**: Unified view of total customers and active service requests.
- **Customer Management**: Full CRUD operations for the customer database, including detailed profile views and service history.
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
- Node.js (v18 or higher)
- PostgreSQL (installed and running locally)

### 1. Clone the repository
```bash
git clone <repository-url>
cd its-no-secret-computer-services-site
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/its_no_secret"
JWT_SECRET="your-super-secret-key"
PORT=5000
```

### 4. Database Initialization
Run the Prisma migrations to set up your local database schema:
```bash
npx prisma migrate dev --name init
```

### 5. Seed the Database
Populate the database with the default admin and sample data:
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
- `JWT_SECRET`: A long, random string used to sign authentication tokens.
- `NODE_ENV`: Should be set to `production`.
- `PORT`: The port the Express server will listen on (defaulting to 5000).

### Build & Migration Commands
In your CI/CD pipeline, you should run:
1. `npm install`
2. `npx prisma generate` (Generates the TypeScript client)
3. `npx prisma migrate deploy` (Applies migrations to the production DB)
4. `npm run build` (Builds the Vite frontend)

### Deployment Architecture
- The **Vite** frontend is built into the `dist/` folder and can be served as static files.
- The **Express** backend (`server/index.ts`) must be running to handle API requests.
- The project is configured with a **proxy** in `vite.config.js` for development; in production, you may need to configure your web server (Nginx/Apache) to route `/api` traffic to the Node.js process.

---

## 📝 Scripts Summary

- `npm run dev`: Runs frontend and backend concurrently in development mode.
- `npm run build`: Compiles the React frontend for production.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run seed`: Executes the Prisma seed script.
- `npx prisma studio`: Opens a visual GUI to manage your database data.

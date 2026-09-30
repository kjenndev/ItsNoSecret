import express from 'express';
import { prisma } from './db.ts';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.ts';
import crmRoutes from './routes/crm.ts';
import leadRoutes from './routes/leads.ts';
import userRoutes from './routes/users.ts';
import portalRoutes from './routes/portal.ts';
import emailSettingsRoutes from './routes/emailSettings.ts';

export const app = express();

app.use(cors({exposedHeaders: ['X-Total-Count', 'X-Next-Offset', 'Retry-After']}));
app.use(express.json({limit: '32kb'}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/users', userRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/settings/email', emailSettingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


app.get('/api/ready', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({status: 'ready'}); }
  catch {res.status(503).json({status: 'unavailable'});}
});
const errors: express.ErrorRequestHandler = (error, _req, res, _next) => {
  const status = error?.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
  res.status(status).json({error: status === 413 ? 'Request body is too large' : status === 400 ? 'Invalid JSON body' : 'Internal server error'});
};
app.use(errors);

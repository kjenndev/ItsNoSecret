import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.ts';
import crmRoutes from './routes/crm.ts';
import userRoutes from './routes/users.ts';
import portalRoutes from './routes/portal.ts';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/users', userRoutes);
app.use('/api/portal', portalRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

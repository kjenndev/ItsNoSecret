import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

import { JWT_SECRET } from '../authConfig.ts';

import { prisma } from '../db.ts';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Access token required' }); return; }
  let claims: any;
  try {
    claims = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof claims !== 'object' || typeof claims.userId !== 'string' || !Number.isInteger(claims.tokenVersion)) throw new Error('Invalid claims');
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); return; }
  try {
    const user = await prisma.user.findUnique({ where: { id: claims.userId } });
    if (!user || !user.isActive || user.tokenVersion !== claims.tokenVersion) { res.status(401).json({ error: 'Session is no longer valid' }); return; }
    (req as any).user = { userId: user.id, email: user.email, roles: user.roles, tokenVersion: user.tokenVersion };
    next();
  } catch { res.status(503).json({ error: 'Authentication temporarily unavailable' }); }
};

export const requireStaff = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user?.roles?.some((r: string) => ['ADMIN', 'TECHNICIAN'].includes(r))) {
    res.status(403).json({ error: 'Staff privileges required' }); return;
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || !user.roles || !user.roles.includes('ADMIN')) {
    res.status(403).json({ error: 'Admin privileges required' });
    return;
  }
  next();
};

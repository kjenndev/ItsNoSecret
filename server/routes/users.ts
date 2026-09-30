import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.ts';
import { claimCustomer, MutationError, lockAccountMutation, requireActiveAdmin } from '../accountMutation.ts';
import { JWT_SECRET } from '../authConfig.ts';
import { validateAccountCredentialsPayload } from '../accountCredentials.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.ts';
import { validate, userInput } from '../validation.ts';

import { pagination, list, search } from '../pagination.ts';
const router = express.Router();
const publicSelect = { id: true, email: true, name: true, roles: true, isActive: true, createdAt: true, customer: { select: { id: true, name: true, email: true } } } as const;
router.use(authenticateToken);
router.put('/me', async (req, res) => {
  const validation = validateAccountCredentialsPayload(req.body);
  if (!validation.success) { res.status(400).json({ error: validation.error }); return; }
  try {
    const currentUser = await prisma.user.findUnique({where: {id: (req as any).user.userId}});
    if (!currentUser || !await bcrypt.compare(validation.data.currentPassword, currentUser.passwordHash)) {
      res.status(400).json({error: 'Current password is incorrect'}); return;
    }
    const data: any = { name: validation.data.name, email: validation.data.email, tokenVersion: {increment: 1} };
    if (validation.data.newPassword) data.passwordHash = await bcrypt.hash(validation.data.newPassword, 10);
    // Optimistic version check prevents concurrent credential edits from replacing each other.
    const updated = await prisma.user.update({where: {id: currentUser.id, tokenVersion: (req as any).user.tokenVersion, isActive: true}, data, select: {...publicSelect, tokenVersion: true}});
    const {tokenVersion, ...user} = updated;
    const token = jwt.sign({userId: user.id, tokenVersion}, JWT_SECRET, {expiresIn: '8h'});
    res.json({token, user});
  } catch (error: any) {
    res.status(error?.code === 'P2025' ? 409 : 400).json({error: 'Could not update credentials; refresh your session or check the email address'});
  }
});
router.use(requireAdmin, pagination);
router.get('/', async (_req, res) => {
  try { await list(res, prisma.user, {where: search(res.locals.page.q, ['name','email']), select: {...publicSelect, _count: {select: {tickets: true}}}, orderBy: [{createdAt: 'desc'}, {id: 'desc'}]}); }
  catch { res.status(500).json({error: 'Failed to fetch users'}); }
});
router.post('/', validate(body => userInput(body, true)), async (req, res) => {
  try {
    const {password, customerId, ...data} = req.body;
    if (customerId && !data.roles.includes('CLIENT')) throw new MutationError(400, 'Only CLIENT accounts may link a customer');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.$transaction(async tx => {
      await lockAccountMutation(tx, (req as any).user);
      const customer = data.roles.includes('CLIENT') && !customerId ? {create: {name: data.name || data.email.split('@')[0], email: data.email}} : undefined;
      const created = await tx.user.create({data: {...data, passwordHash, customer}, select: publicSelect});
      if (customerId) await claimCustomer(tx, customerId, created.id);
      return customerId ? tx.user.findUnique({where: {id: created.id}, select: publicSelect}) : created;
    }, {isolationLevel: 'ReadCommitted'});
    res.status(201).json(user);
  } catch (error) { res.status(error instanceof MutationError ? error.status : 400).json({error: error instanceof MutationError ? error.message : 'Failed to create user; email or customer may already be linked'}); }
});
router.put('/:id', validate(body => userInput(body)), async (req, res) => {
  try {
    const {password, customerId, ...data} = req.body;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.$transaction(async tx => {
      await lockAccountMutation(tx, (req as any).user);
      const existing = await tx.user.findUnique({where: {id: req.params.id as string}, include: {customer: true}});
      if (!existing) throw new MutationError(404, 'User not found');
      const roles = data.roles ?? existing.roles;
      if (req.params.id === (req as any).user.userId && (data.isActive === false || !roles.includes('ADMIN'))) {
        throw new MutationError(400, 'You cannot deactivate or remove your own administrator role');
      }
      if (customerId && !roles.includes('CLIENT')) throw new MutationError(400, 'Only CLIENT accounts may link a customer');
      // Omission is not a disconnect. Role removal preserves the historical profile.
      if ('customerId' in req.body) {
        if (customerId) await claimCustomer(tx, customerId, existing.id);
        else data.customer = {disconnect: true};
      }
      if (roles.includes('CLIENT') && !existing.customer && !('customerId' in req.body)) {
        data.customer = {create: {name: data.name || existing.name || existing.email.split('@')[0], email: data.email || existing.email}};
      }
      data.tokenVersion = {increment: 1};
      const updated = await tx.user.update({where: {id: req.params.id as string}, data, select: publicSelect});
      await requireActiveAdmin(tx);
      return updated;
    }, {isolationLevel: 'ReadCommitted'});
    res.json(user);
  } catch (error) { res.status(error instanceof MutationError ? error.status : 400).json({error: error instanceof MutationError ? error.message : 'Failed to update user'}); }
});
// Compatibility endpoint: deactivate rather than delete linked history.
router.delete('/:id', async (req, res) => {
  if (req.params.id === (req as any).user.userId) { res.status(400).json({error: 'You cannot deactivate your own account'}); return; }
  try {
    await prisma.$transaction(async tx => {
      await lockAccountMutation(tx, (req as any).user);
      await tx.user.update({where: {id: req.params.id as string}, data: {isActive: false, tokenVersion: {increment: 1}}});
      await requireActiveAdmin(tx);
    }, {isolationLevel: 'ReadCommitted'});
    res.status(204).send();
  } catch (error) { res.status(error instanceof MutationError ? error.status : 400).json({error: error instanceof MutationError ? error.message : 'Failed to deactivate user'}); }
});
export default router;

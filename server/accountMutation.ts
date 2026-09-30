import type { Prisma } from '../src/generated/prisma/client.ts';

export class MutationError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export async function claimCustomer(tx: Prisma.TransactionClient, customerId: string, userId: string) {
  // Release the target's prior profile in this transaction; a failed claim rolls it back.
  await tx.customer.updateMany({where: {userId}, data: {userId: null}});
  const claimed = await tx.customer.updateMany({
    where: {id: customerId, OR: [{userId: null}, {userId}]}, data: {userId}
  });
  if (claimed.count !== 1) throw new MutationError(409, 'Customer is unavailable or belongs to another account');
}

export async function lockAccountMutation(tx: Prisma.TransactionClient, actor: {userId: string; tokenVersion: number}) {
  // Common transaction-scoped PostgreSQL lock, shared by POST, PUT and DELETE
  // across processes. ReadCommitted gives each waiter a fresh committed view.
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${731942681})`;
  // Also serialize with /me's optimistic credential update, which does not use the common lock.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actor.userId} FOR UPDATE`;
  const current = await tx.user.findUnique({where: {id: actor.userId}});
  if (!current?.isActive || current.tokenVersion !== actor.tokenVersion) throw new MutationError(401, 'Session is no longer valid');
  if (!current.roles.includes('ADMIN')) throw new MutationError(403, 'Admin privileges required');
}

export async function requireActiveAdmin(tx: Prisma.TransactionClient) {
  if (await tx.user.count({where: {isActive: true, roles: {has: 'ADMIN'}}}) < 1) {
    throw new MutationError(409, 'At least one active administrator is required');
  }
}

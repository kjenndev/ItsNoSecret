// @vitest-environment node
import {afterAll, beforeEach, expect, it, vi} from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import {randomBytes} from 'node:crypto';
const db = vi.hoisted(() => ({user: {findUnique: vi.fn()}, customer: {delete: vi.fn(), findMany: vi.fn(), create: vi.fn()}, ticket: {deleteMany: vi.fn()}, comment: {deleteMany: vi.fn()}, lead: {updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn()}, $transaction: vi.fn(), $queryRaw: vi.fn()}));
vi.mock('./db.ts', () => ({prisma: db}));
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const router = (await import('./routes/crm.ts')).default;
const app = express(); app.use(express.json()); app.use('/api/crm', router);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(r => server.on('listening', r));
afterAll(() => new Promise<void>(r => server.close(() => r())));
const url = `http://127.0.0.1:${(server.address() as any).port}/api/crm`;
let state: any;
function request(path = '/customers/target', actor: string | null = 'admin', method = 'DELETE') {
 const headers: Record<string, string> = {};
 if (actor) headers.Authorization = `Bearer ${jwt.sign({userId: actor, tokenVersion: 0, roles: ['ADMIN']}, process.env.JWT_SECRET!)}`;
 return fetch(url + path, {method, headers});
}
beforeEach(() => {
 vi.resetAllMocks();
 state = {
  users: [{id: 'admin', roles: ['ADMIN'], isActive: true, tokenVersion: 0}, {id: 'tech', roles: ['TECHNICIAN'], isActive: true, tokenVersion: 0}, {id: 'client', roles: ['CLIENT'], isActive: true, tokenVersion: 0, passwordHash: 'unchanged-hash'}],
  customers: [{id: 'target', userId: 'client'}, {id: 'other', userId: null}],
  tickets: [{id: 't1', customerId: 'target'}, {id: 't2', customerId: 'target'}, {id: 't3', customerId: 'other'}],
  comments: [{id: 'c1', ticketId: 't1', authorId: 'admin'}, {id: 'c2', ticketId: 't2', authorId: 'client'}, {id: 'c3', ticketId: 't3', authorId: 'client'}],
  leads: [{id: 'l1', status: 'CONVERTED', convertedCustomerId: 'target', convertedAt: new Date('2026-01-01T00:00:00Z')}, {id: 'l2', status: 'CONVERTED', convertedCustomerId: 'other', convertedAt: new Date('2026-02-01T00:00:00Z')}, {id: 'l3', status: 'NEW', convertedCustomerId: null, convertedAt: null}],
 };
 db.user.findUnique.mockImplementation(async ({where}) => state.users.find((u: any) => u.id === where.id) ?? null);
 db.$queryRaw.mockImplementation(async (strings, id) => {
  const sql = strings.join('?');
  if (sql.includes('"Customer"')) return state.customers.filter((c: any) => c.id === id).map(({id}: any) => ({id}));
  if (sql.includes('"Ticket"')) return state.tickets.filter((t: any) => t.customerId === id).map(({id}: any) => ({id}));
  return [];
 });
 db.comment.deleteMany.mockImplementation(async ({where}) => {
  const ids = state.tickets.filter((t: any) => t.customerId === where.ticket.customerId).map((t: any) => t.id);
  state.comments = state.comments.filter((c: any) => !ids.includes(c.ticketId)); return {count: 2};
 });
 db.ticket.deleteMany.mockImplementation(async ({where}) => {state.tickets = state.tickets.filter((t: any) => t.customerId !== where.customerId); return {count: 2};});
 db.lead.updateMany.mockImplementation(async ({where, data}) => {state.leads.forEach((l: any) => {if (l.convertedCustomerId === where.convertedCustomerId) Object.assign(l, data);}); return {count: 1};});
 db.customer.delete.mockImplementation(async ({where}) => {state.customers = state.customers.filter((c: any) => c.id !== where.id);});
 db.lead.findUnique.mockImplementation(async ({where}) => structuredClone(state.leads.find((l: any) => l.id === where.id) ?? null));
 db.customer.create.mockResolvedValue({id: 'replacement'}); db.lead.update.mockResolvedValue({});
 db.$transaction.mockImplementation(async fn => {const snapshot = structuredClone(state); try {return await fn(db);} catch (error) {state = snapshot; throw error;}});
});
it('atomically deletes only the requested customer and its tickets/comments, retaining lead history and login', async () => {
 const before = structuredClone(state); const response = await request();
 expect(response.status).toBe(204); expect(await response.text()).toBe('');
 expect(state.customers).toEqual([before.customers[1]]); expect(state.tickets).toEqual([before.tickets[2]]); expect(state.comments).toEqual([before.comments[2]]);
 expect(state.leads).toEqual([{...before.leads[0], convertedCustomerId: null}, ...before.leads.slice(1)]);
 expect(state.users).toEqual(before.users); expect(db.$transaction).toHaveBeenCalledTimes(1);
});

it.each([['tech', 403], ['client', 403], [null, 401]])('denies actor %s without mutations', async (actor, status) => {
 const before = structuredClone(state);
 expect((await request('/customers/target', actor as string | null)).status).toBe(status);
 expect(state).toEqual(before); expect(db.$transaction).not.toHaveBeenCalled();
});

it('returns 404 for a missing customer without deleting anything', async () => {
 const before = structuredClone(state); const response = await request('/customers/missing');
 expect(response.status).toBe(404); expect(await response.json()).toEqual({error: 'Customer not found'});
 expect(state).toEqual(before); expect(db.comment.deleteMany).not.toHaveBeenCalled();
});
it('locks customer and then tickets before deleting comments to exclude concurrent FK inserts', async () => {
 expect((await request()).status).toBe(204);
 const calls = db.$queryRaw.mock.calls;
 expect(calls).toHaveLength(2);
 expect(calls[0][0].join('?')).toMatch(/SELECT id FROM "Customer" WHERE id = \? FOR UPDATE/);
 expect(calls[1][0].join('?')).toMatch(/SELECT id FROM "Ticket" WHERE "customerId" = \? ORDER BY id FOR UPDATE/);
 expect(calls.map(c => c[1])).toEqual(['target', 'target']);
 expect(db.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(db.comment.deleteMany.mock.invocationCallOrder[0]);
 expect(db.comment.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(db.ticket.deleteMany.mock.invocationCallOrder[0]);
 expect(db.ticket.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(db.customer.delete.mock.invocationCallOrder[0]);
});

it.each(['CONVERTED', 'NEW'])('prevents re-conversion of a retained historical lead with status %s', async status => {
 expect((await request()).status).toBe(204);
 state.leads[0].status = status;
 const before = structuredClone(state);
 const response = await request('/leads/l1/convert', 'admin', 'POST');
 expect(response.status).toBe(409);
 expect(await response.json()).toEqual({error: 'This lead was already converted; its customer has been deleted.'});
 expect(state).toEqual(before); expect(db.customer.create).not.toHaveBeenCalled(); expect(db.lead.update).not.toHaveBeenCalled();
});

it.each(['comment', 'ticket', 'lead', 'customer'])('rolls back all mutations if %s deletion stage fails', async stage => {
 const before = structuredClone(state);
 const method = stage === 'lead' ? db.lead.updateMany : stage === 'customer' ? db.customer.delete : stage === 'comment' ? db.comment.deleteMany : db.ticket.deleteMany;
 method.mockRejectedValueOnce(new Error('injected failure'));
 const response = await request();
 expect(response.status).toBe(500); expect(await response.json()).toEqual({error: 'Failed to delete customer'});
 expect(state).toEqual(before);
});
it('returns a retryable conflict and rolls back if concurrent conversion deadlocks', async () => {
 const before = structuredClone(state);
 db.lead.updateMany.mockRejectedValueOnce({code: 'P2034'});
 const response = await request();
 expect(response.status).toBe(409);
 expect(await response.json()).toEqual({error: 'Customer deletion conflicted with another update; retry'});
 expect(state).toEqual(before);
});
it('still recovers a legacy stranded lead without any conversion timestamp', async () => {
 state.leads[0] = {...state.leads[0], convertedCustomerId: null, convertedAt: null};
 expect((await request('/leads/l1/convert', 'admin', 'POST')).status).toBe(201);
 expect(db.customer.create).toHaveBeenCalledTimes(1);
});
it('still returns linked converted customers idempotently', async () => {
 state.leads[0].convertedCustomer = state.customers[0];
 const response = await request('/leads/l1/convert', 'admin', 'POST');
 expect(response.status).toBe(200); expect(await response.json()).toMatchObject({alreadyConverted: true, createdCustomer: false, customer: {id: 'target'}});
 expect(db.customer.create).not.toHaveBeenCalled();
});
it.each(['inactive', 'revoked', 'removed'])('rejects an invalid current account: %s', async reason => {
 if (reason === 'inactive') state.users[0].isActive = false;
 if (reason === 'revoked') state.users[0].tokenVersion = 1;
 if (reason === 'removed') state.users.shift();
 expect((await request()).status).toBe(401); expect(db.$transaction).not.toHaveBeenCalled();
});
it('allows ADMIN in a multi-role current account', async () => {
 state.users[0].roles = ['CLIENT', 'TECHNICIAN', 'ADMIN'];
 expect((await request()).status).toBe(204);
});

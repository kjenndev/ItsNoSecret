// @vitest-environment node
import {afterAll, beforeEach, expect, it, vi} from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import {randomBytes} from 'node:crypto';
const db = vi.hoisted(() => ({user: {findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn()}, customer: {updateMany: vi.fn()}, lead: {findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn()}, $transaction: vi.fn(), $queryRaw: vi.fn()}));
vi.mock('./db.ts', () => ({prisma: db}));
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const usersRouter = (await import('./routes/users.ts')).default;
const crmRouter = (await import('./routes/crm.ts')).default;
const app = express(); app.use(express.json()); app.use('/users', usersRouter); app.use('/crm', crmRouter);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(r => server.on('listening', r));
afterAll(() => new Promise<void>(r => server.close(() => r())));
const url = `http://127.0.0.1:${(server.address() as any).port}`;
let users: Record<string, any>, customers: Record<string, any>;
function request(path: string, method: string, body?: any, actor = 'admin') {
 const token = jwt.sign({userId: actor, tokenVersion: 0}, process.env.JWT_SECRET!);
 return fetch(url + path, {method, headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, ...(body ? {body: JSON.stringify(body)} : {})});
}
beforeEach(() => {
 vi.resetAllMocks();
 users = {admin: {id: 'admin', roles: ['ADMIN'], isActive: true, tokenVersion: 0}, target: {id: 'target', email: 'target@example.test', name: 'Original', roles: ['CLIENT'], isActive: true, tokenVersion: 0, customer: null}};
 customers = {occupied: {id: 'occupied', userId: 'owner'}, free: {id: 'free', userId: null}};
 db.user.findUnique.mockImplementation(async ({where}: any) => structuredClone(users[where.id] ?? null));
 db.user.create.mockImplementation(async ({data}: any) => {
  users.new = {id: 'new', isActive: true, tokenVersion: 0, ...data};
  if (data.customer?.connect) customers[data.customer.connect.id].userId = 'new';
  return users.new;
 });
 db.user.update.mockImplementation(async ({where, data}: any) => {
  if (data.customer?.connect) customers[data.customer.connect.id].userId = where.id;
  users[where.id] = {...users[where.id], ...data, tokenVersion: users[where.id].tokenVersion + 1};
  return users[where.id];
 });
 db.user.count.mockImplementation(async () => Object.values(users).filter(u => u.isActive && u.roles.includes('ADMIN')).length);
 db.customer.updateMany.mockImplementation(async ({where, data}: any) => {
  let count = 0;
  for (const c of Object.values(customers)) {
   if (where.id && c.id !== where.id) continue;
   if ('userId' in where && c.userId !== where.userId) continue;
   if (where.OR && !where.OR.some((w: any) => w.userId === c.userId)) continue;
   Object.assign(c, data); count++;
  }
  return {count};
 });
 db.$transaction.mockImplementation(async (fn: any) => {
  const snapshot = structuredClone({users, customers});
  try {return await fn(db);} catch (e) {users = snapshot.users; customers = snapshot.customers; throw e;}
 });
});
it.each(['POST', 'PUT'])('%s cannot steal an occupied customer and rolls back user changes', async method => {
 const before = structuredClone({users, customers});
 const response = await request(method === 'POST' ? '/users' : '/users/target', method, {email: 'new@example.test', password: 'long-password-value', name: 'Changed', roles: ['CLIENT'], customerId: 'occupied'});
 expect(response.status).toBe(409);
 expect({users, customers}).toEqual(before);
});
it.each(['POST', 'PUT'])('%s claims only an unowned or same-target customer', async method => {
 const response = await request(method === 'POST' ? '/users' : '/users/target', method, {email: 'new@example.test', password: 'long-password-value', roles: ['CLIENT'], customerId: 'free'});
 expect(response.status).toBe(method === 'POST' ? 201 : 200);
 expect(customers.free.userId).toBe(method === 'POST' ? 'new' : 'target');
 if (method === 'PUT') expect((await request('/users/target', 'PUT', {customerId: 'free'})).status).toBe(200);
});

it.each(['PUT', 'DELETE'])('%s competing administrators cannot remove each other', async method => {
 users.admin.email = 'admin@example.test';
 users.target = {...users.admin, id: 'target', email: 'target@example.test'};
 // Authenticate both requests before either transaction is allowed to mutate.
 const find = db.user.findUnique.getMockImplementation()!;
 let admitted = 0; let admit!: () => void;
 const bothAuthenticated = new Promise<void>(r => {admit = r;});
 db.user.findUnique.mockImplementation(async (args: any) => {
  const result = await find(args);
  if (admitted < 2) {admitted++; if (admitted === 2) admit(); await bothAuthenticated;}
  return result;
 });
 let tail = Promise.resolve();
 db.$transaction.mockImplementation(async (fn: any) => {
  let unlock: (() => void) | undefined;
  let snapshot: any;
  const tx = {...db, $queryRaw: async (strings: TemplateStringsArray) => {
   if (!strings.join('?').includes('pg_advisory_xact_lock')) return [];
   expect(strings.join('?')).toContain('pg_advisory_xact_lock');
   const prior = tail; tail = new Promise<void>(r => {unlock = r;}); await prior;
   snapshot = structuredClone({users, customers}); return [];
  }};
  try {return await fn(tx);} catch (e) {if (snapshot) {users = snapshot.users; customers = snapshot.customers;} throw e;}
  finally {unlock?.();}
 });
 const results = await Promise.all([request('/users/target', method, method === 'PUT' ? {roles: ['CLIENT']} : undefined), request('/users/admin', method, method === 'PUT' ? {roles: ['CLIENT']} : undefined, 'target')]);
 expect(Object.values(users).filter(u => u.isActive && u.roles.includes('ADMIN'))).toHaveLength(1);
 expect(results.filter(r => r.ok)).toHaveLength(1);
 expect(results.some(r => r.status === 401 || r.status === 403)).toBe(true);
});
it.each(['POST', 'PUT', 'DELETE'])('%s revalidates the acting session after acquiring the common lock', async method => {
 db.$queryRaw.mockImplementation(async () => {users.admin.tokenVersion++; return [];});
 const response = await request(method === 'POST' ? '/users' : '/users/target', method, method === 'POST' ? {email: 'new@example.test', password: 'long-password-value'} : {name: 'Changed'});
 expect(response.status).toBe(401);
 expect(db.user.create).not.toHaveBeenCalled(); expect(db.user.update).not.toHaveBeenCalled();
 expect(db.$queryRaw).toHaveBeenCalled();
});
it.each(['PUT', 'DELETE'])('%s rejects a mutation if the active-admin invariant would fail', async method => {
 db.user.count.mockResolvedValue(0);
 expect((await request('/users/target', method, method === 'PUT' ? {isActive: false} : undefined)).status).toBe(409);
 expect(users.target.isActive).toBe(true);
});

it('lead DELETE cannot remove a lead whose conversion wins the race', async () => {
 let lead: any = {id: 'lead', status: 'NEW', convertedCustomerId: null, convertedAt: null};
 db.lead.findUnique.mockImplementation(async () => {
  const snapshot = {...lead}; lead = {...lead, status: 'CONVERTED', convertedCustomerId: 'customer', convertedAt: new Date()}; return snapshot;
 });
 db.lead.delete.mockImplementation(async () => {lead = null;});
 db.lead.deleteMany.mockImplementation(async ({where}: any) => {
  // Conversion commits before PostgreSQL evaluates the DELETE predicate.
  lead = {...lead, status: 'CONVERTED', convertedCustomerId: 'customer', convertedAt: new Date()};
  expect(where).toEqual({id: 'lead', status: {not: 'CONVERTED'}, convertedCustomerId: null, convertedAt: null});
  return {count: 0};
 });
 expect((await request('/crm/leads/lead', 'DELETE')).status).toBe(409);
 expect(lead?.status).toBe('CONVERTED');
 expect(db.lead.delete).not.toHaveBeenCalled();
});
it.each([true, false])('lead conditional DELETE reports success or absence (%s)', async exists => {
 db.lead.deleteMany.mockResolvedValue({count: exists ? 1 : 0});
 db.lead.findUnique.mockResolvedValue(null);
 expect((await request('/crm/leads/lead', 'DELETE')).status).toBe(exists ? 204 : 404);
 if (exists) expect(db.lead.findUnique).not.toHaveBeenCalled();
});

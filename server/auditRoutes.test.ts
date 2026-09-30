// @vitest-environment node
import { beforeEach, afterAll, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
const db = vi.hoisted(() => {
  const model = () => Object.fromEntries(['findUnique','findFirst','findMany','count','create','update','delete'].map(k => [k, vi.fn()]));
  return { user: model(), customer: model(), ticket: model(), comment: model(), lead: model(), emailSettings: model(), $transaction: vi.fn(), $queryRaw: vi.fn() };
});
vi.mock('./db.ts', () => ({ prisma: db }));
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const {app} = await import('./app.ts');
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(r => server.on('listening', r));
const url = `http://127.0.0.1:${(server.address() as any).port}`;
afterAll(() => new Promise<void>(r => server.close(() => r())));
let account: any;
beforeEach(() => {
  vi.resetAllMocks();
  account = { id: 'staff', email: 'staff@example.test', roles: ['ADMIN'], tokenVersion: 0, isActive: true, customer: { id: 'customer' } };
  db.user.findUnique.mockImplementation(async () => account);
  for (const m of [db.user, db.customer, db.ticket, db.comment, db.lead]) { m.findMany.mockResolvedValue([]); m.count.mockResolvedValue(0); m.create.mockImplementation(async ({data}: any) => ({id: 'new', ...data})); m.update.mockImplementation(async ({data}: any) => ({...account, ...data, tokenVersion: 1})); }
  db.$transaction.mockImplementation(async (fn: any) => fn(db));
});
function request(path: string, method = 'GET', body?: any, claims: any = {}) {
 const token = jwt.sign({userId: 'staff', roles: ['ADMIN'], tokenVersion: 0, ...claims}, process.env.JWT_SECRET!);
 return fetch(url + '/api' + path, {method, headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, ...(body !== undefined ? {body: JSON.stringify(body)} : {})});
}
it('CRM rejects current CLIENT despite an old ADMIN token', async () => {
 account.roles = ['CLIENT'];
 expect((await request('/crm/customers')).status).toBe(403);
 expect(db.customer.findMany).not.toHaveBeenCalled();
});

it.each([false, true])('rejects inactive or revoked accounts (%s)', async (active) => {
 account.isActive = active; account.tokenVersion = 2;
 expect((await request('/crm/customers')).status).toBe(401);
});
it('uses current staff roles even if the token has only CLIENT', async () => {
 expect((await request('/crm/customers', 'GET', undefined, {roles: ['CLIENT']})).status).toBe(200);
});
it('admin edits preserve an omitted customer link and revoke old sessions', async () => {
 db.user.count.mockResolvedValue(1); // The acting administrator remains active.
 const target = {...account, id: 'client', roles: ['CLIENT']};
 db.user.findUnique.mockImplementation(async ({where}: any) => where.id === 'client' ? target : account);
 const response = await request('/users/client', 'PUT', {name: 'Updated'});
 expect(response.status).toBe(200);
 const data = db.user.update.mock.calls[0][0].data;
 expect(data.customer).toBeUndefined();
 expect(data.tokenVersion).toEqual({increment: 1});
});
it('new users default to CLIENT and invalid roles fail before writes', async () => {
 expect((await request('/users', 'POST', {email: 'Person@Example.test', password: 'correct horse battery', name: 'Person'})).status).toBe(201);
 expect(db.user.create.mock.calls[0][0].data).toMatchObject({email: 'person@example.test', roles: ['CLIENT']});
 expect((await request('/users', 'POST', {email: 'x@y.test', password: 'long-password', roles: ['ROOT']})).status).toBe(400);
 expect(db.user.create).toHaveBeenCalledTimes(1);
});
it('deactivation keeps relational history rather than deleting users', async () => {
 db.user.count.mockResolvedValue(2); // Another active administrator remains.
 expect((await request('/users/other', 'DELETE')).status).toBe(204);
 expect(db.user.delete).not.toHaveBeenCalled();
 expect(db.user.update.mock.calls[0][0].data).toMatchObject({isActive: false, tokenVersion: {increment: 1}});
});

it('login normalizes email and includes a revocable session version', async () => {
 account.passwordHash = await bcrypt.hash('long-password', 4);
 const response = await request('/auth/login', 'POST', {email: 'STAFF@EXAMPLE.TEST', password: 'long-password'});
 expect(response.status).toBe(200);
 const {token} = await response.json();
 expect(jwt.decode(token)).toMatchObject({tokenVersion: 0});
 expect(db.user.findUnique.mock.calls[0][0].where.email).toBe('staff@example.test');
 account.isActive = false;
 expect((await request('/auth/login', 'POST', {email: 'staff@example.test', password: 'long-password'})).status).toBe(401);
});
it('rejects malformed login fields before database access', async () => {
 expect((await request('/auth/login', 'POST', {email: {}, password: 'x'})).status).toBe(400);
 expect(db.user.findUnique).not.toHaveBeenCalled();
});

it('staff comments default private and may explicitly be public', async () => {
 expect((await request('/crm/tickets/t1/comments', 'POST', {text: 'Diagnosis'})).status).toBe(201);
 expect(db.comment.create.mock.calls[0][0].data.isInternal).toBe(true);
 expect((await request('/crm/tickets/t1/comments', 'POST', {text: 'Ready', isInternal: false})).status).toBe(201);
 expect(db.comment.create.mock.calls[1][0].data.isInternal).toBe(false);
 expect((await request('/crm/tickets/t1/comments', 'POST', {text: ' ', isInternal: 'false'})).status).toBe(400);
});
it('portal reads filter internal comments and portal writes are public', async () => {
 account.roles = ['CLIENT'];
 db.ticket.findUnique.mockImplementation(async (args: any) => ({id: 't1', customer: {userId: 'staff'}, comments: args.include.comments?.where?.isInternal === false ? [{text: 'Public'}] : [{text: 'Private'}, {text: 'Public'}]}));
 const response = await request('/portal/tickets/t1');
 expect(response.status).toBe(200);
 expect((await response.json()).comments).toEqual([{text: 'Public'}]);
 expect((await request('/portal/tickets/t1/comments', 'POST', {text: 'Thanks'})).status).toBe(201);
 expect(db.comment.create.mock.calls[0][0].data.isInternal).toBe(false);
 expect((await request('/portal/tickets/t1/comments', 'POST', {text: 'Hide', isInternal: true})).status).toBe(400);
});
it('ticket assignment accepts active staff only and empty string clears assignment', async () => {
 db.user.findUnique.mockResolvedValueOnce(account).mockResolvedValueOnce({...account, roles: ['CLIENT']});
 expect((await request('/crm/tickets/t1', 'PUT', {assignedToId: 'client'})).status).toBe(400);
 expect(db.ticket.update).not.toHaveBeenCalled();
 expect((await request('/crm/tickets/t1', 'PUT', {assignedToId: ''})).status).toBe(200);
 expect(db.ticket.update.mock.calls[0][0].data.assignedToId).toBeNull();
});
it('customer emails are optional normalized and malformed fields fail before writes', async () => {
 expect((await request('/crm/customers', 'POST', {name: 'Person', email: ''})).status).toBe(201);
 expect(db.customer.create.mock.calls[0][0].data.email).toBeNull();
 expect((await request('/crm/customers', 'POST', {name: 'Person', email: 'PERSON@EXAMPLE.TEST'})).status).toBe(201);
 expect(db.customer.create.mock.calls[1][0].data.email).toBe('person@example.test');
 expect((await request('/crm/customers', 'POST', {name: {}})).status).toBe(400);
 expect(db.customer.create).toHaveBeenCalledTimes(2);
});
it('validates ticket fields and prevents portal privilege-field injection', async () => {
 expect((await request('/crm/tickets', 'POST', {title: '', description: 'x', customerId: 'c'})).status).toBe(400);
 expect((await request('/crm/tickets/t1', 'PUT', {status: 'INVALID'})).status).toBe(400);
 account.roles = ['CLIENT']; db.customer.findUnique.mockResolvedValue({id: 'own-customer'});
 expect((await request('/portal/tickets', 'POST', {title: 'Help', description: 'Please help', priority: 'URGENT', customerId: 'other', assignedToId: 'staff'})).status).toBe(201);
 expect(db.ticket.create.mock.calls[0][0].data).toMatchObject({customerId: 'own-customer', priority: 'MEDIUM'});
 expect(db.ticket.create.mock.calls[0][0].data.assignedToId).toBeUndefined();
});

const leadBody = {name: 'Caller', phone: '555-0100', message: 'Help me'};
it('public intake allowlists contact fields and never persists internal notes', async () => {
 expect((await request('/leads', 'POST', {...leadBody, notes: 'Injected private note', status: 'CONVERTED', source: 'ADMIN_CREATED'})).status).toBe(201);
 const data = db.lead.create.mock.calls[0][0].data;
 expect(data.notes).toBeUndefined(); expect(data.status).toBe('NEW'); expect(data.source).toBe('CONSULTATION_MODAL');
});
it('rejects oversized and wrongly typed lead fields', async () => {
 expect((await request('/leads', 'POST', {...leadBody, name: 'n'.repeat(201)})).status).toBe(400);
 expect((await request('/leads', 'POST', {...leadBody, email: {bad: true}})).status).toBe(400);
 expect(db.lead.create).not.toHaveBeenCalled();
});
it('only the dedicated conversion route can establish converted state', async () => {
 expect((await request('/crm/leads', 'POST', {...leadBody, status: 'CONVERTED'})).status).toBe(400);
 db.lead.findUnique.mockResolvedValue({id: 'l1', ...leadBody, status: 'NEW'});
 expect((await request('/crm/leads/l1', 'PUT', {...leadBody, status: 'CONVERTED'})).status).toBe(409);
 expect(db.lead.update).not.toHaveBeenCalled();
});
it('conversion matches email case-insensitively inside a row-locked transaction', async () => {
 db.lead.findUnique.mockResolvedValue({id: 'l1', ...leadBody, email: 'Person@Example.test', status: 'NEW'});
 db.customer.findMany.mockResolvedValue([{id: 'existing'}]);
 const response = await request('/crm/leads/l1/convert', 'POST', {});
 expect(response.status).toBe(200);
 expect(db.$queryRaw).toHaveBeenCalled();
 expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(db.lead.findUnique.mock.invocationCallOrder[0]);
 expect(db.customer.findMany.mock.calls[0][0].where.email).toEqual({equals: 'Person@Example.test', mode: 'insensitive'});
 expect(db.customer.create).not.toHaveBeenCalled();
 expect(db.lead.update.mock.calls[0][0].data).toMatchObject({status: 'CONVERTED', convertedCustomerId: 'existing', convertedAt: expect.any(Date)});
});
it('concurrent same-lead phone-only conversions create one customer', async () => {
 let stored: any = {id: 'l1', ...leadBody, email: null, status: 'NEW'};
 let tail = Promise.resolve();
 db.$transaction.mockImplementation(async (fn: any) => {
   let unlock = () => {}; let acquired = false;
   const tx = {...db, $queryRaw: async (strings: TemplateStringsArray, id: string) => {
     expect(strings.join('?')).toMatch(/FOR UPDATE/); expect(id).toBe('l1');
     const prior = tail; tail = new Promise<void>(r => {unlock = r;}); await prior; acquired = true; return [{id}];
   }};
   try {return await fn(tx);} finally {if (acquired) unlock();}
 });
 db.lead.findUnique.mockImplementation(async () => { const snapshot = {...stored}; await new Promise(r => setTimeout(r, 15)); return snapshot; });
 db.lead.update.mockImplementation(async ({data}: any) => {stored = {...stored, ...data, convertedCustomer: {id: 'new'}}; return stored;});
 const responses = await Promise.all([request('/crm/leads/l1/convert', 'POST', {}), request('/crm/leads/l1/convert', 'POST', {})]);
 expect(responses.map(r => r.status).sort()).toEqual([200,201]);
 expect(db.customer.create).toHaveBeenCalledTimes(1);
 expect((await Promise.all(responses.map(r => r.json()))).some(r => r.alreadyConverted)).toBe(true);
});

it.each(['/crm/users','/crm/customers','/crm/tickets','/crm/leads','/users'])('bounds and counts collection %s', async path => {
 const model = path.includes('customers') ? db.customer : path.includes('tickets') ? db.ticket : path.includes('leads') ? db.lead : db.user;
 model.count.mockResolvedValue(123); model.findMany.mockResolvedValue([{id: 'one'}]);
 const response = await request(path + '?limit=20&offset=40&q=Person');
 expect(response.status).toBe(200); expect(await response.json()).toEqual([{id: 'one'}]);
 expect(response.headers.get('X-Total-Count')).toBe('123'); expect(response.headers.get('X-Next-Offset')).toBe('60');
 expect(model.findMany.mock.calls[0][0]).toMatchObject({take: 20, skip: 40});
 expect(JSON.stringify(model.findMany.mock.calls[0][0].where)).toContain('Person');
 const defaults = await request(path);
 expect(defaults.status).toBe(200);
 expect(model.findMany.mock.calls[1][0]).toMatchObject({take: 50, skip: 0});
});
it.each(['limit=101','limit=0','offset=-1','limit=2.5','limit=1&limit=2','offset=9007199254740992'])('rejects invalid pagination %s', async query => {
 expect((await request('/crm/customers?' + query)).status).toBe(400);
 expect(db.customer.findMany).not.toHaveBeenCalled();
});
it('assignment lookup only lists active staff', async () => {
 await request('/crm/users');
 expect(db.user.findMany.mock.calls[0][0].where).toMatchObject({isActive: true, roles: {hasSome: ['ADMIN','TECHNICIAN']}});
});
it('admin users include their customer linkage', async () => {
 await request('/users'); expect(db.user.findMany.mock.calls[0][0].select).toMatchObject({customer: {select: {id: true}}, isActive: true});
});
it('portal profile paginates embedded tickets and counts only visible comments', async () => {
 account.roles = ['CLIENT']; db.customer.findUnique.mockResolvedValue({id: 'c1', tickets: []}); db.ticket.count.mockResolvedValue(70);
 const response = await request('/portal/me?limit=10&offset=20');
 expect(response.status).toBe(200); expect((await response.json()).tickets).toEqual([]);
 expect(response.headers.get('X-Total-Count')).toBe('70'); expect(response.headers.get('X-Next-Offset')).toBe('30');
 expect(db.customer.findUnique.mock.calls[0][0].include.tickets).toMatchObject({take: 10, skip: 20, include: {_count: {select: {comments: {where: {isInternal: false}}}}}});
 expect(db.ticket.count.mock.calls[0][0].where.customerId).toBe('c1');
});
it('summary returns global counts with bounded recent open tickets', async () => {
 db.lead.count.mockResolvedValue(81); db.customer.count.mockResolvedValue(90); db.ticket.count.mockResolvedValue(67); db.ticket.findMany.mockResolvedValue([{id: 'recent'}]);
 const response = await request('/crm/summary'); expect(response.status).toBe(200);
 expect(await response.json()).toEqual({leadCount:81, customerCount:90, openTicketCount:67, recentOpenTickets:[{id:'recent'}]});
 expect(db.ticket.findMany.mock.calls[0][0]).toMatchObject({take: 5, where: {status: {in: ['OPEN','IN_PROGRESS']}}});
});

it('customer detail bounds its embedded tickets', async () => {
 db.customer.findUnique.mockResolvedValue({id: 'c1', tickets: []}); db.ticket.count.mockResolvedValue(20);
 const response = await request('/crm/customers/c1?limit=5'); expect(response.status).toBe(200);
 expect(db.customer.findUnique.mock.calls[0][0].include.tickets.take).toBe(5);
 expect(response.headers.get('X-Total-Count')).toBe('20');
});
it.each(['/crm/tickets/t1', '/portal/tickets/t1'])('ticket details paginate comments on %s', async path => {
 account.roles = ['ADMIN','CLIENT']; db.ticket.findUnique.mockResolvedValue({id: 't1', customer: {userId: 'staff'}}); db.comment.count.mockResolvedValue(30);
 const response = await request(path + '?limit=5&offset=10'); expect(response.status).toBe(200);
 expect(db.ticket.findUnique.mock.calls[0][0].include.comments).toMatchObject({take: 5, skip: 10});
 expect(response.headers.get('X-Total-Count')).toBe('30');
});

it.each(['/leads', '/auth/login'])('throttles unauthenticated intake %s before writes', async path => {
 db.user.findUnique.mockResolvedValue(null);
 const statuses: number[] = [];
 for (let i=0; i<12; i++) {
   const response = await request(path, 'POST', path === '/leads' ? leadBody : {email: 'missing@example.test', password: 'bad-password'});
   statuses.push(response.status);
   if (response.status === 429) expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
 }
 expect(statuses).toContain(429);
});

it('readiness checks the database and reports unavailability without leaking errors', async () => {
 db.$queryRaw.mockResolvedValue([{ok: 1}]);
 let response = await request('/ready'); expect(response.status).toBe(200); expect(db.$queryRaw).toHaveBeenCalled();
 db.$queryRaw.mockRejectedValue(new Error('private-database-information'));
 response = await request('/ready'); expect(response.status).toBe(503); expect(await response.text()).not.toContain('private-database-information');
 expect((await request('/health')).status).toBe(200);
});
it('exposes pagination metadata via CORS', async () => {
 const response = await request('/crm/customers');
 expect(response.headers.get('Access-Control-Expose-Headers')).toContain('X-Total-Count');
 expect(response.headers.get('Access-Control-Expose-Headers')).toContain('X-Next-Offset');
});
it('caps JSON request bodies and returns JSON errors', async () => {
 const response = await request('/crm/customers', 'POST', {name: 'x'.repeat(40000)});
 expect(response.status).toBe(413); expect(response.headers.get('content-type')).toContain('application/json');
 expect(db.customer.create).not.toHaveBeenCalled();
});

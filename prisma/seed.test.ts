// @vitest-environment node
import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(async ({ where }: { where: { email: string } }) => ({ id: where.email, email: where.email })),
  userUpsert: vi.fn(),
  customer: vi.fn(async () => ({ id: 'sample-customer' })),
  ticket: vi.fn(async () => ({ count: 3 })),
  lead: vi.fn(),
  disconnect: vi.fn(async () => {}),
  end: vi.fn(async () => {}),
}));
vi.mock('dotenv/config', () => ({}));
vi.mock('pg', () => ({ default: { Pool: class { end = mocks.end; } } }));
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: class {} }));
vi.mock('../src/generated/prisma/client.ts', () => ({ PrismaClient: class {
  user = { findUnique: mocks.findUnique, upsert: mocks.userUpsert };
  customer = { upsert: mocks.customer, create: mocks.customer, createMany: mocks.customer };
  ticket = { upsert: mocks.ticket, create: mocks.ticket, createMany: mocks.ticket };
  lead = { upsert: mocks.lead, create: mocks.lead, createMany: mocks.lead };
  $disconnect = mocks.disconnect;
} }));

it('runs the seed entrypoint with user setup only and no CRM sample creation', async () => {
  await import('./seed.ts');
  await vi.waitFor(() => expect(mocks.end).toHaveBeenCalledOnce());
  expect(mocks.findUnique).toHaveBeenCalledTimes(2);
  expect(mocks.userUpsert).not.toHaveBeenCalled();
  expect(mocks.customer).not.toHaveBeenCalled();
  expect(mocks.ticket).not.toHaveBeenCalled();
  expect(mocks.lead).not.toHaveBeenCalled();
  expect(mocks.disconnect).toHaveBeenCalledOnce();
});

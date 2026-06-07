import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create Admin User
  const adminPasswordHash = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@itsnosecret.com' },
    update: {},
    create: {
      email: 'admin@itsnosecret.com',
      passwordHash: adminPasswordHash,
      name: 'System Admin',
      roles: ['ADMIN'],
    },
  });
  console.log('Admin user created:', admin.email);

  // Create Technician User
  const techPasswordHash = await bcrypt.hash('tech123', 10);
  const tech = await prisma.user.upsert({
    where: { email: 'tech@itsnosecret.com' },
    update: {},
    create: {
      email: 'tech@itsnosecret.com',
      passwordHash: techPasswordHash,
      name: 'Service Tech',
      roles: ['TECHNICIAN'],
    },
  });
  console.log('Technician user created:', tech.email);

  // Create Customers
  const customer1 = await prisma.customer.upsert({
    where: { email: 'jane.doe@example.com' },
    update: {},
    create: {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '555-0101',
      address: '123 Main St, Anytown',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: 'bob.smith@example.com' },
    update: {},
    create: {
      name: 'Bob Smith',
      email: 'bob.smith@example.com',
      phone: '555-0202',
      address: '456 Oak Ave, Somewhere',
    },
  });
  console.log('Customers created');

  // Create Tickets
  // Note: Prisma 7 might handle createMany differently or need individual creates if not supported by adapter
  await prisma.ticket.createMany({
    data: [
      {
        title: 'Computer won\'t start',
        description: 'Customer reports a black screen upon power on. No beeps.',
        status: 'OPEN',
        priority: 'HIGH',
        customerId: customer1.id,
      },
      {
        title: 'Slow performance',
        description: 'Windows takes 10 minutes to boot. Suspected malware.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        customerId: customer1.id,
        assignedToId: tech.id,
      },
      {
        title: 'Data recovery from external drive',
        description: 'External drive dropped, not clicking but not mounting.',
        status: 'OPEN',
        priority: 'URGENT',
        customerId: customer2.id,
      },
    ],
  });
  console.log('Sample tickets created');

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

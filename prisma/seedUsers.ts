import bcrypt from 'bcryptjs';
import type { PrismaClient } from '../src/generated/prisma/client.ts';

function requireSeedPassword(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value || value.length < 16 || Buffer.byteLength(value, 'utf8') > 72 ||
      value.trim() !== value || new Set(value).size < 10 ||
      /password|example|placeholder|change[-_ ]?me|replace[-_ ]?me/i.test(value)) {
    throw new Error(`${key} must be an explicit strong password (at least 16 characters, at most 72 UTF-8 bytes; no defaults or examples)`);
  }
  return value;
}

export async function seedUsers(prisma: Pick<PrismaClient, 'user'>, env: NodeJS.ProcessEnv) {
  const adminEmail = 'admin@itsnosecret.com';
  const techEmail = 'tech@itsnosecret.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const existingTech = await prisma.user.findUnique({ where: { email: techEmail } });
  // Validate every needed credential before making any writes.
  const adminPassword = existingAdmin ? null : requireSeedPassword(env, 'SEED_ADMIN_PASSWORD');
  const techPassword = existingTech ? null : requireSeedPassword(env, 'SEED_TECH_PASSWORD');
  // Empty updates also preserve credentials if another process creates the user after our read.
  const admin = existingAdmin ?? await prisma.user.upsert({
    where: { email: adminEmail }, update: {},
    create: { email: adminEmail, name: 'System Admin', roles: ['ADMIN'], passwordHash: await bcrypt.hash(adminPassword!, 10) },
  });
  const tech = existingTech ?? await prisma.user.upsert({
    where: { email: techEmail }, update: {},
    create: { email: techEmail, name: 'Service Tech', roles: ['TECHNICIAN'], passwordHash: await bcrypt.hash(techPassword!, 10) },
  });
  return { admin, tech };
}

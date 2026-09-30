import type {Server} from 'node:http';
import {prisma, pool} from './db.ts';
import {stopEmailWorker} from './emailWorker.ts';
export async function shutdown(server: Server) {
  try {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  } finally {
    await stopEmailWorker();
    try {await prisma.$disconnect();} finally {await pool.end();}
  }
}

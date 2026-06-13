import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;
try {
  prisma = new PrismaClient();
  prisma.$connect().then(() => {
    console.log('[server] Database connected');
  }).catch((err) => {
    throw err;
  });
} catch (err) {
  console.error('[server] Database connection failed:', err);
  // Don't crash — let server start without DB for now
}

export default prisma!;

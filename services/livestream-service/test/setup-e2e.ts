import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  // Connect to test database using Prisma 7.x adapter
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/livestream_test';
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  await prisma.$connect();

  // Connect to test Redis
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380'),
    password: process.env.REDIS_PASSWORD,
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});

export { prisma, redis };

import { z } from 'zod';

const isPostgresConnectionString = (v: string) => {
  return /^postgres(?:ql)?(?:\+asyncpg)?:\/\/.+/.test(v);
};

const dbUrlSchema = z
  .string()
  .refine((val) => {
    try {
      new URL(val);
      return true;
    } catch (err) {
      return isPostgresConnectionString(val);
    }
  }, {
    message: 'Invalid DATABASE_URL',
  });

export const envSchema = z.object({
  DATABASE_URL: dbUrlSchema,
  PORT: z.coerce.number().optional().default(3333),
  REDIS_HOST: z.string().optional().default('localhost'),
  REDIS_PORT: z.coerce.number().optional().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  FRONTEND_BASE_URL: z.string().url().optional().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

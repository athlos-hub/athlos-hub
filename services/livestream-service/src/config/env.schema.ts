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

const envProfileSchema = z
  .string()
  .optional()
  .transform((raw): 'dev' | 'prod' => {
    if (raw == null || raw.trim() === '') return 'dev';
    const v = raw.trim().toLowerCase();
    if (v === 'prod' || v === 'production') return 'prod';
    if (v === 'dev' || v === 'development') return 'dev';
    throw new Error(`ENV must be dev or prod (got ${raw})`);
  });

export const envSchema = z
  .object({
    ENV: envProfileSchema,
    DATABASE_URL: dbUrlSchema,
    PORT: z.coerce.number().optional().default(3333),
    REDIS_HOST: z.string().optional().default('localhost'),
    REDIS_PORT: z.coerce.number().optional().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    FRONTEND_BASE_URL: z.string().url().optional().default('http://localhost:3000'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().url().optional(),
    COMPETITIONS_SERVICE_URL: z.string().url().optional().default('http://localhost:8001'),
    TRUST_GATEWAY: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === '') return true;
        if (typeof v === 'boolean') return v;
        const s = String(v).trim().toLowerCase();
        return !(s === 'false' || s === '0' || s === 'no');
      }),
  })
  .superRefine((data, ctx) => {
    if (data.ENV === 'prod' && data.TRUST_GATEWAY === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'TRUST_GATEWAY cannot be false when ENV is prod',
        path: ['TRUST_GATEWAY'],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

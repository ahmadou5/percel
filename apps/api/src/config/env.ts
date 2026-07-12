import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('1d'),
  PAYSTACK_ENV: z.enum(['live', 'test']).default('live'),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  MONNIFY_BASE_URL: z.string().url().default('https://sandbox.monnify.com'),
  MONNIFY_API_KEY: z.string().optional().default(''),
  MONNIFY_SECRET_KEY: z.string().optional().default(''),
  MONNIFY_CONTRACT_CODE: z.string().optional().default(''),
  MONNIFY_WEBHOOK_SECRET: z.string().optional().default(''),
  SQUAD_BASE_URL: z.string().url().default('https://sandbox-api-d.squadco.com'),
  SQUAD_SECRET_KEY: z.string().optional().default(''),
  SQUAD_MERCHANT_ID: z.string().optional().default(''),
  SQUAD_BENEFICIARY_ACCOUNT: z.string().optional().default(''),
  SQUAD_DEFAULT_CUSTOMER_GENDER: z.enum(['1', '2']).default('1'),
  VTPASS_USERNAME: z.string().min(1),
  VTPASS_PASSWORD: z.string().min(1),
  SMILE_IDENTITY_API_KEY: z.string().min(1),
  SMILE_IDENTITY_PARTNER_ID: z.string().min(1),
  GOOGLE_MAPS_API_KEY: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  SENTRY_DSN: z.string().optional().default(""),
  GIT_SHA: z.string().optional().default(''),
  CORS_ORIGIN: z.string().default('*'),
  PLATFORM_COMMISSION_PERCENT: z.coerce.number().min(0).max(100).default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;

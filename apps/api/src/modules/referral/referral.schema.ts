import { Type } from '@sinclair/typebox';
import { z } from 'zod';

export const ApplyReferralBody = Type.Object({
  code: Type.String({ minLength: 4, maxLength: 12 }),
});

export const ApplyReferralSchema = z.object({
  code: z.string().min(4).max(12).regex(/^[A-Z0-9]+$/, 'Code must be uppercase alphanumeric'),
});

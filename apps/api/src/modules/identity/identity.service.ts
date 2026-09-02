import type { PrismaClient } from '@prisma/client';

import { normalizeIdentityProvider, type IdentityProviderName } from '../../lib/identityVerification.js';
import { ValidationError } from '../../utils/errors.js';

const ACTIVE_IDENTITY_PROVIDER_KEY = 'settings:active_identity_provider';

export class IdentityProviderService {
  constructor(private readonly prisma: PrismaClient) {}

  async getActiveProvider(): Promise<IdentityProviderName> {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: ACTIVE_IDENTITY_PROVIDER_KEY } });
    const value = setting?.value;
    if (typeof value === 'string') return normalizeIdentityProvider(value);
    if (value && typeof value === 'object' && 'provider' in value) {
      return normalizeIdentityProvider(String((value as { provider?: unknown }).provider));
    }
    return 'NONE';
  }

  async setActiveProvider(provider: string) {
    const normalized = normalizeIdentityProvider(provider);
    await this.prisma.appSetting.upsert({
      where: { key: ACTIVE_IDENTITY_PROVIDER_KEY },
      create: { key: ACTIVE_IDENTITY_PROVIDER_KEY, value: { provider: normalized } },
      update: { value: { provider: normalized } },
    });
    return { provider: normalized };
  }
}

export function assertKnownIdentityProvider(provider: string): void {
  const normalized = normalizeIdentityProvider(provider);
  if (normalized === 'NONE' && provider?.trim().toUpperCase() !== 'NONE') {
    throw new ValidationError('Unsupported identity provider');
  }
}

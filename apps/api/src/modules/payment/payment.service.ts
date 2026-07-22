import { PaymentProvider, type PrismaClient } from '@prisma/client';

import { env } from '../../config/env.js';
import {
  createMonnifyReservedAccount,
  initializeMonnifyTransaction,
  initiateMonnifyTransfer,
  listMonnifyBanks,
  resolveMonnifyAccount,
  verifyMonnifyTransaction,
} from '../../lib/monnify.js';
import {
  createDedicatedNUBAN,
  createTransferRecipient,
  getBank,
  initializeTransaction,
  initiateTransfer,
  listBanks,
  resolveAccountNumber,
  verifyTransaction,
} from '../../lib/paystack.js';
import {
  createSquadVirtualAccount,
  initializeSquadTransaction,
  initiateSquadTransfer,
  listSquadBanks,
  resolveSquadAccount,
  verifySquadTransaction,
} from '../../lib/squad.js';
import { PaymentError, ValidationError } from '../../utils/errors.js';

export const ACTIVE_PAYMENT_PROVIDER_KEY = 'payment.activeProvider';


export type VirtualAccountOwner = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  dateOfBirth?: Date | null;
  address?: string | null;
  bvn?: string | null;
  nin?: string | null;
  providerCustomerCode?: string | null;
};

export type VirtualAccountResult = {
  accountNumber: string;
  accountName?: string | null;
  bankName: string;
  bankCode?: string | null;
  providerCustomerCode?: string | null;
};

function normalizeProvider(provider: string): PaymentProvider {
  const value = provider.trim().toUpperCase();
  if (value === PaymentProvider.MONNIFY || value === PaymentProvider.PAYSTACK || value === PaymentProvider.SQUAD) {
    return value;
  }
  throw new ValidationError('Unsupported payment provider');
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? 'Percel', lastName: parts.slice(1).join(' ') || 'User' };
}

function formatSquadDob(value?: Date | null) {
  if (!value) throw new PaymentError('Date of birth is required to create a Squad virtual account');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${month}/${day}/${value.getUTCFullYear()}`;
}

export class PaymentProviderService {
  constructor(private readonly prisma: PrismaClient) {}

  async getActiveProvider(): Promise<PaymentProvider> {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: ACTIVE_PAYMENT_PROVIDER_KEY } });
    const value = setting?.value;
    if (typeof value === 'string') return normalizeProvider(value);
    if (value && typeof value === 'object' && 'provider' in value) {
      return normalizeProvider(String((value as { provider?: unknown }).provider ?? PaymentProvider.MONNIFY));
    }
    return PaymentProvider.MONNIFY;
  }

  async setActiveProvider(provider: string) {
    const normalized = normalizeProvider(provider);
    await this.prisma.appSetting.upsert({
      where: { key: ACTIVE_PAYMENT_PROVIDER_KEY },
      create: { key: ACTIVE_PAYMENT_PROVIDER_KEY, value: { provider: normalized } },
      update: { value: { provider: normalized } },
    });
    return { provider: normalized };
  }

  async initializeTopUp(provider: PaymentProvider, data: { email: string; amountKobo: number; amount: number; reference: string; customerName: string; metadata: Record<string, unknown>; callbackUrl?: string }) {
    if (provider === PaymentProvider.PAYSTACK) {
      return initializeTransaction(data.email, data.amountKobo, data.reference, data.metadata, data.callbackUrl);
    }
    if (provider === PaymentProvider.MONNIFY) {
      return initializeMonnifyTransaction({
        email: data.email,
        amount: data.amount,
        reference: data.reference,
        customerName: data.customerName,
        metadata: data.metadata,
        callbackUrl: data.callbackUrl,
      });
    }
    return initializeSquadTransaction({
      email: data.email,
      amountKobo: data.amountKobo,
      reference: data.reference,
      customerName: data.customerName,
      metadata: data.metadata,
      callbackUrl: data.callbackUrl,
    });
  }

  async verifyTopUp(provider: PaymentProvider, reference: string) {
    if (provider === PaymentProvider.PAYSTACK) return verifyTransaction(reference);
    if (provider === PaymentProvider.MONNIFY) return verifyMonnifyTransaction(reference);
    return verifySquadTransaction(reference);
  }

  isSuccessfulTopUp(provider: PaymentProvider, gatewayTx: Record<string, unknown>) {
    if (provider === PaymentProvider.PAYSTACK) return gatewayTx.status === 'success';
    if (provider === PaymentProvider.MONNIFY) {
      const status = String(gatewayTx.paymentStatus ?? gatewayTx.status ?? '').toUpperCase();
      return status === 'PAID' || status === 'SUCCESS' || status === 'SUCCESSFUL';
    }
    return String(gatewayTx.transaction_status ?? gatewayTx.status ?? '').toLowerCase() === 'success';
  }

  isFailedTopUp(provider: PaymentProvider, gatewayTx: Record<string, unknown>) {
    if (provider === PaymentProvider.PAYSTACK) return gatewayTx.status === 'failed' || gatewayTx.status === 'reversed';
    const status = String(gatewayTx.paymentStatus ?? gatewayTx.transaction_status ?? gatewayTx.status ?? '').toUpperCase();
    return status === 'FAILED' || status === 'REVERSED' || status === 'ABANDONED';
  }

  async listBanks(provider: PaymentProvider) {
    if (provider === PaymentProvider.PAYSTACK) return listBanks();
    if (provider === PaymentProvider.MONNIFY) return listMonnifyBanks();
    return listSquadBanks();
  }

  async resolveBankAccount(provider: PaymentProvider, accountNumber: string, bankCode: string) {
    if (provider === PaymentProvider.PAYSTACK) {
      const [account, bank] = await Promise.all([resolveAccountNumber(accountNumber, bankCode), getBank(bankCode)]);
      return { accountName: account.account_name, accountNumber: account.account_number, bankCode, bankName: bank?.name ?? bankCode };
    }
    if (provider === PaymentProvider.MONNIFY) return resolveMonnifyAccount(accountNumber, bankCode);
    return resolveSquadAccount(accountNumber, bankCode);
  }

  async initiateBankTransfer(provider: PaymentProvider, data: { name: string; accountNumber: string; bankCode: string; amount: number; reference: string; reason?: string }) {
    if (provider === PaymentProvider.PAYSTACK) {
      const recipient = await createTransferRecipient({ name: data.name, accountNumber: data.accountNumber, bankCode: data.bankCode });
      await initiateTransfer({ recipient: recipient.recipient_code, amount: data.amount, reference: data.reference, reason: data.reason });
      return { recipientCode: recipient.recipient_code };
    }
    if (provider === PaymentProvider.MONNIFY) {
      return initiateMonnifyTransfer({
        reference: data.reference,
        amount: data.amount,
        accountNumber: data.accountNumber,
        bankCode: data.bankCode,
        accountName: data.name,
        reason: data.reason,
      });
    }
    return initiateSquadTransfer({
      reference: data.reference,
      amountKobo: Math.round(data.amount * 100),
      accountNumber: data.accountNumber,
      bankCode: data.bankCode,
      accountName: data.name,
      reason: data.reason,
    });
  }

  async createVirtualAccount(provider: PaymentProvider, owner: VirtualAccountOwner): Promise<VirtualAccountResult> {
    if (provider === PaymentProvider.PAYSTACK) {
      if (!owner.providerCustomerCode) throw new PaymentError('Paystack customer code is required before creating a dedicated account');
      const account = await createDedicatedNUBAN(owner.providerCustomerCode);
      return {
        accountNumber: account.account_number,
        accountName: account.account_name ?? owner.fullName,
        bankName: account.bank?.name ?? 'Percel Wallet',
        bankCode: account.bank?.slug ?? null,
        providerCustomerCode: owner.providerCustomerCode,
      };
    }
    if (provider === PaymentProvider.MONNIFY) {
      if (!owner.bvn && !owner.nin) throw new PaymentError('BVN or NIN is required to create a Monnify reserved account');
      return createMonnifyReservedAccount({
        accountReference: `PERCEL_${owner.id}`,
        accountName: owner.fullName,
        customerEmail: owner.email,
        customerName: owner.fullName,
        bvn: owner.bvn,
        nin: owner.nin,
      });
    }
    if (!owner.bvn) throw new PaymentError('BVN is required to create a Squad virtual account');
    if (!owner.address) throw new PaymentError('Address is required to create a Squad virtual account');
    const { firstName, lastName } = splitName(owner.fullName);
    return createSquadVirtualAccount({
      customerIdentifier: `PERCEL_${owner.id}`,
      firstName,
      lastName,
      phone: owner.phone,
      email: owner.email,
      bvn: owner.bvn,
      dob: formatSquadDob(owner.dateOfBirth),
      address: owner.address,
      gender: env.SQUAD_DEFAULT_CUSTOMER_GENDER,
    });
  }

  async createVirtualAccountWithFallback(
    preferredProvider: PaymentProvider,
    owner: VirtualAccountOwner,
  ): Promise<VirtualAccountResult & { provider: PaymentProvider }> {
    const candidates: PaymentProvider[] = Array.from(
      new Set([preferredProvider, PaymentProvider.MONNIFY, PaymentProvider.PAYSTACK, PaymentProvider.SQUAD]),
    );

    const results = await Promise.allSettled(
      candidates.map(async (candidate) => {
        const result = await this.createVirtualAccount(candidate, owner);
        return { ...result, provider: candidate };
      }),
    );

    for (const res of results) {
      if (res.status === 'fulfilled') {
        return res.value;
      }
    }

    const firstReason = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    throw firstReason?.reason ?? new PaymentError('Failed to create virtual account on available payment providers');
  }
}

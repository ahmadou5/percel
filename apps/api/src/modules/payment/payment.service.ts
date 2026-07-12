import { PaymentProvider, type PrismaClient } from '@prisma/client';

import { PaymentError, ValidationError } from '../../utils/errors.js';
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

export const ACTIVE_PAYMENT_PROVIDER_KEY = 'payment.activeProvider';


export type VirtualAccountOwner = {
  email: string;
  fullName: string;
  phone: string;
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

function providerNotImplemented(provider: PaymentProvider): never {
  throw new PaymentError(`${provider.toLowerCase()} payment provider is configured but its gateway adapter is not implemented yet`);
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

  async initializeTopUp(provider: PaymentProvider, data: { email: string; amountKobo: number; reference: string; metadata: Record<string, unknown>; callbackUrl?: string }) {
    if (provider === PaymentProvider.PAYSTACK) {
      return initializeTransaction(data.email, data.amountKobo, data.reference, data.metadata, data.callbackUrl);
    }
    providerNotImplemented(provider);
  }

  async verifyTopUp(provider: PaymentProvider, reference: string) {
    if (provider === PaymentProvider.PAYSTACK) return verifyTransaction(reference);
    providerNotImplemented(provider);
  }

  async listBanks(provider: PaymentProvider) {
    if (provider === PaymentProvider.PAYSTACK) return listBanks();
    providerNotImplemented(provider);
  }

  async resolveBankAccount(provider: PaymentProvider, accountNumber: string, bankCode: string) {
    if (provider === PaymentProvider.PAYSTACK) {
      const [account, bank] = await Promise.all([resolveAccountNumber(accountNumber, bankCode), getBank(bankCode)]);
      return { accountName: account.account_name, accountNumber: account.account_number, bankCode, bankName: bank?.name ?? bankCode };
    }
    providerNotImplemented(provider);
  }

  async initiateBankTransfer(provider: PaymentProvider, data: { name: string; accountNumber: string; bankCode: string; amount: number; reference: string; reason?: string }) {
    if (provider === PaymentProvider.PAYSTACK) {
      const recipient = await createTransferRecipient({ name: data.name, accountNumber: data.accountNumber, bankCode: data.bankCode });
      await initiateTransfer({ recipient: recipient.recipient_code, amount: data.amount, reference: data.reference, reason: data.reason });
      return { recipientCode: recipient.recipient_code };
    }
    providerNotImplemented(provider);
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
    providerNotImplemented(provider);
  }
}

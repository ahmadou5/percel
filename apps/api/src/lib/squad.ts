import crypto from 'node:crypto';

import axios, { AxiosError } from 'axios';

import { env } from '../config/env.js';
import { PaymentError } from '../utils/errors.js';

type SquadEnvelope<T> = {
  status?: number | string;
  success?: boolean;
  message?: string;
  data?: T;
};

type SquadInitResponse = { checkout_url?: string; transaction_ref?: string };
type SquadVerifyResponse = { transaction_status?: string; transaction_amount?: number; transaction_ref?: string };
type SquadVirtualAccountResponse = {
  bank_code?: string;
  virtual_account_number?: string;
  customer_identifier?: string;
  first_name?: string;
  last_name?: string;
};
type SquadLookupResponse = { account_name?: string; account_number?: string };
type SquadTransferResponse = { transaction_reference?: string; response_description?: string };

const squad = axios.create({
  baseURL: env.SQUAD_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

function assertSquadConfigured() {
  if (!env.SQUAD_SECRET_KEY) {
    throw new PaymentError('Squad is selected but SQUAD_SECRET_KEY is not configured');
  }
}

function wrapSquadError(error: unknown): never {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message ?? 'Squad request failed';
    throw new PaymentError(message);
  }
  throw new PaymentError('Squad request failed');
}

function headers() {
  assertSquadConfigured();
  return { Authorization: `Bearer ${env.SQUAD_SECRET_KEY}` };
}

async function unwrap<T>(request: Promise<{ data: SquadEnvelope<T> }>) {
  const { data } = await request;
  if (data.success === false || (typeof data.status === 'number' && data.status >= 400)) {
    throw new PaymentError(data.message ?? 'Squad request failed');
  }
  return data.data as T;
}

export async function initializeSquadTransaction(data: {
  email: string;
  amountKobo: number;
  reference: string;
  customerName: string;
  metadata: Record<string, unknown>;
  callbackUrl?: string;
}) {
  try {
    const response = await unwrap<SquadInitResponse>(
      squad.post(
        '/transaction/initiate',
        {
          amount: data.amountKobo,
          email: data.email,
          currency: 'NGN',
          initiate_type: 'inline',
          transaction_ref: data.reference,
          customer_name: data.customerName,
          callback_url: data.callbackUrl,
          payment_channels: ['card', 'bank', 'ussd', 'transfer'],
          metadata: data.metadata,
        },
        { headers: headers() },
      ),
    );
    return { authorization_url: response.checkout_url ?? '', reference: response.transaction_ref ?? data.reference };
  } catch (error) {
    wrapSquadError(error);
  }
}

export async function verifySquadTransaction(reference: string) {
  try {
    return unwrap<SquadVerifyResponse>(squad.get(`/transaction/verify/${encodeURIComponent(reference)}`, { headers: headers() }));
  } catch (error) {
    wrapSquadError(error);
  }
}

export async function createSquadVirtualAccount(data: {
  customerIdentifier: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  bvn: string;
  dob: string;
  address: string;
  gender: '1' | '2';
}) {
  try {
    const response = await unwrap<SquadVirtualAccountResponse>(
      squad.post(
        '/virtual-account',
        {
          customer_identifier: data.customerIdentifier,
          first_name: data.firstName,
          last_name: data.lastName,
          middle_name: '',
          mobile_num: data.phone.replace(/^\+234/, '0'),
          email: data.email,
          bvn: data.bvn,
          dob: data.dob,
          gender: data.gender,
          address: data.address,
          beneficiary_account: env.SQUAD_BENEFICIARY_ACCOUNT || undefined,
        },
        { headers: headers() },
      ),
    );
    if (!response.virtual_account_number) throw new PaymentError('Squad did not return a virtual account number');
    return {
      accountNumber: response.virtual_account_number,
      accountName: `${response.first_name ?? data.firstName} ${response.last_name ?? data.lastName}`.trim(),
      bankName: 'Squad Virtual Account',
      bankCode: response.bank_code ?? null,
      providerCustomerCode: response.customer_identifier ?? data.customerIdentifier,
    };
  } catch (error) {
    wrapSquadError(error);
  }
}

export async function resolveSquadAccount(accountNumber: string, bankCode: string) {
  try {
    const data = await unwrap<SquadLookupResponse>(
      squad.post('/payout/account/lookup', { bank_code: bankCode, account_number: accountNumber }, { headers: headers() }),
    );
    return {
      accountName: data.account_name ?? '',
      accountNumber: data.account_number ?? accountNumber,
      bankCode,
      bankName: bankCode,
    };
  } catch (error) {
    wrapSquadError(error);
  }
}

export async function initiateSquadTransfer(data: {
  reference: string;
  amountKobo: number;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  reason?: string;
}) {
  try {
    const reference = env.SQUAD_MERCHANT_ID && !data.reference.startsWith(`${env.SQUAD_MERCHANT_ID}_`)
      ? `${env.SQUAD_MERCHANT_ID}_${data.reference}`
      : data.reference;
    const response = await unwrap<SquadTransferResponse>(
      squad.post(
        '/payout/transfer',
        {
          transaction_reference: reference,
          amount: String(data.amountKobo),
          bank_code: data.bankCode,
          account_number: data.accountNumber,
          account_name: data.accountName,
          currency_id: 'NGN',
          remark: data.reason ?? 'Percel bank transfer',
        },
        { headers: headers() },
      ),
    );
    return { recipientCode: response.transaction_reference ?? reference, status: response.response_description };
  } catch (error) {
    wrapSquadError(error);
  }
}

const STATIC_FALLBACK_BANKS = [
  { name: 'GTBank Plc', code: '000013', slug: '000013', country: 'Nigeria', currency: 'NGN', type: 'nuban' },
  { name: 'Access Bank', code: '000014', slug: '000014', country: 'Nigeria', currency: 'NGN', type: 'nuban' },
  { name: 'Zenith Bank Plc', code: '000015', slug: '000015', country: 'Nigeria', currency: 'NGN', type: 'nuban' },
  { name: 'First Bank of Nigeria', code: '000016', slug: '000016', country: 'Nigeria', currency: 'NGN', type: 'nuban' },
  { name: 'Wema Bank', code: '000017', slug: '000017', country: 'Nigeria', currency: 'NGN', type: 'nuban' },
];

type SquadBank = { name: string; code: string; slug?: string; country?: string; currency?: string; type?: string };

let liveBanksCache: { banks: SquadBank[]; fetchedAt: number } | null = null;

export async function listSquadBanks(): Promise<SquadBank[]> {
  if (liveBanksCache && Date.now() - liveBanksCache.fetchedAt < 24 * 60 * 60 * 1000) {
    return liveBanksCache.banks;
  }

  try {
    const response = await squad.get<SquadEnvelope<SquadBank[]>>('/payout/banks', { headers: headers(), timeout: 10_000 });
    const banks = Array.isArray(response.data?.data) ? response.data.data : [];
    if (banks.length > 0) {
      liveBanksCache = { banks, fetchedAt: Date.now() };
      return banks;
    }
  } catch {
    // Fall through to static list
  }

  return STATIC_FALLBACK_BANKS;
}

export function verifySquadWebhookSignature(payload: Record<string, unknown>, signature?: string) {
  assertSquadConfigured();
  if (!signature) return false;
  const version = typeof payload.version === 'string' ? payload.version : undefined;
  const signaturePayload = version === 'v2' || version === 'v3'
    ? [
        payload.transaction_reference,
        payload.virtual_account_number,
        payload.currency,
        payload.principal_amount,
        payload.settled_amount,
        payload.customer_identifier,
      ].map((value) => String(value ?? '')).join('|')
    : JSON.stringify(payload);
  const hash = crypto.createHmac('sha512', env.SQUAD_SECRET_KEY).update(signaturePayload).digest('hex');
  return hash === signature;
}

import crypto from 'node:crypto';

import axios, { AxiosError } from 'axios';

import { env } from '../config/env.js';
import { PaymentError } from '../utils/errors.js';

type MonnifyEnvelope<T> = {
  requestSuccessful?: boolean;
  responseMessage?: string;
  responseCode?: string;
  responseBody?: T;
};

type MonnifyInitResponse = {
  checkoutUrl?: string;
  paymentReference?: string;
  transactionReference?: string;
};

type MonnifyReservedAccountResponse = {
  accountReference: string;
  accountName?: string;
  accounts?: Array<{ accountNumber?: string; accountName?: string; bankName?: string; bankCode?: string }>;
};

type MonnifyBank = { name?: string; code?: string; ussdTemplate?: string };
type MonnifyNameEnquiry = { accountNumber?: string; accountName?: string; bankCode?: string };
type MonnifyTransferResponse = { reference?: string; status?: string; amount?: number; destinationAccountName?: string };

const monnify = axios.create({
  baseURL: env.MONNIFY_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

function assertMonnifyConfigured() {
  if (!env.MONNIFY_API_KEY || !env.MONNIFY_SECRET_KEY || !env.MONNIFY_CONTRACT_CODE) {
    throw new PaymentError('Monnify is selected but MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE are not configured');
  }
}

function wrapMonnifyError(error: unknown): never {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.responseMessage ?? error.response?.data?.message ?? 'Monnify request failed';
    throw new PaymentError(message);
  }
  throw new PaymentError('Monnify request failed');
}

async function unwrap<T>(request: Promise<{ data: MonnifyEnvelope<T> }>) {
  const { data } = await request;
  if (data.requestSuccessful === false) throw new PaymentError(data.responseMessage ?? 'Monnify request failed');
  return data.responseBody as T;
}

async function getAccessToken() {
  assertMonnifyConfigured();
  try {
    const credentials = Buffer.from(`${env.MONNIFY_API_KEY}:${env.MONNIFY_SECRET_KEY}`).toString('base64');
    const data = await unwrap<{ accessToken: string }>(
      monnify.post('/api/v1/auth/login', undefined, { headers: { Authorization: `Basic ${credentials}` } }),
    );
    return data.accessToken;
  } catch (error) {
    wrapMonnifyError(error);
  }
}

async function authHeaders() {
  return { Authorization: `Bearer ${await getAccessToken()}` };
}

export async function initializeMonnifyTransaction(data: {
  email: string;
  amount: number;
  reference: string;
  customerName: string;
  metadata: Record<string, unknown>;
  callbackUrl?: string;
}) {
  try {
    const response = await unwrap<MonnifyInitResponse>(
      monnify.post(
        '/api/v1/merchant/transactions/init-transaction',
        {
          amount: data.amount,
          customerName: data.customerName,
          customerEmail: data.email,
          paymentReference: data.reference,
          paymentDescription: 'Percel wallet top up',
          currencyCode: 'NGN',
          contractCode: env.MONNIFY_CONTRACT_CODE,
          redirectUrl: data.callbackUrl,
          metaData: data.metadata,
        },
        { headers: await authHeaders() },
      ),
    );
    return {
      authorization_url: response.checkoutUrl ?? '',
      reference: response.paymentReference ?? response.transactionReference ?? data.reference,
    };
  } catch (error) {
    wrapMonnifyError(error);
  }
}

export async function verifyMonnifyTransaction(reference: string) {
  try {
    const data = await unwrap<Record<string, unknown>>(
      monnify.get(`/api/v2/transactions/${encodeURIComponent(reference)}`, { headers: await authHeaders() }),
    );
    return data;
  } catch (error) {
    wrapMonnifyError(error);
  }
}

export async function createMonnifyReservedAccount(data: {
  accountReference: string;
  accountName: string;
  customerEmail: string;
  customerName: string;
  bvn?: string | null;
  nin?: string | null;
}) {
  try {
    const response = await unwrap<MonnifyReservedAccountResponse>(
      monnify.post(
        '/api/v2/bank-transfer/reserved-accounts',
        {
          accountReference: data.accountReference,
          accountName: data.accountName,
          currencyCode: 'NGN',
          contractCode: env.MONNIFY_CONTRACT_CODE,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          getAllAvailableBanks: true,
          bvn: data.bvn || undefined,
          nin: data.nin || undefined,
        },
        { headers: await authHeaders() },
      ),
    );
    const account = response.accounts?.[0];
    if (!account?.accountNumber) throw new PaymentError('Monnify did not return a reserved account number');
    return {
      accountNumber: account.accountNumber,
      accountName: account.accountName ?? response.accountName ?? data.accountName,
      bankName: account.bankName ?? 'Monnify Reserved Account',
      bankCode: account.bankCode ?? null,
      providerCustomerCode: response.accountReference,
    };
  } catch (error) {
    wrapMonnifyError(error);
  }
}

export async function listMonnifyBanks() {
  try {
    const banks = await unwrap<MonnifyBank[]>(monnify.get('/api/v1/banks', { headers: await authHeaders() }));
    return banks.map((bank) => ({ name: bank.name, code: bank.code, slug: bank.code, country: 'Nigeria', currency: 'NGN', type: 'nuban' }));
  } catch (error) {
    wrapMonnifyError(error);
  }
}

export async function resolveMonnifyAccount(accountNumber: string, bankCode: string) {
  try {
    const data = await unwrap<MonnifyNameEnquiry>(
      monnify.get('/api/v1/disbursements/account/validate', {
        headers: await authHeaders(),
        params: { accountNumber, bankCode },
      }),
    );
    return {
      accountName: data.accountName ?? '',
      accountNumber: data.accountNumber ?? accountNumber,
      bankCode,
      bankName: bankCode,
    };
  } catch (error) {
    wrapMonnifyError(error);
  }
}

export async function initiateMonnifyTransfer(data: {
  reference: string;
  amount: number;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  reason?: string;
}) {
  try {
    const response = await unwrap<MonnifyTransferResponse>(
      monnify.post(
        '/api/v2/disbursements/single',
        {
          amount: data.amount,
          reference: data.reference,
          narration: data.reason ?? 'Percel bank transfer',
          destinationBankCode: data.bankCode,
          destinationAccountNumber: data.accountNumber,
          destinationAccountName: data.accountName,
          currency: 'NGN',
          async: true,
        },
        { headers: await authHeaders() },
      ),
    );
    return { recipientCode: response.reference ?? data.reference, status: response.status };
  } catch (error) {
    wrapMonnifyError(error);
  }
}

export async function getMonnifyTransferStatus(reference: string): Promise<'SUCCESS' | 'PENDING' | 'FAILED'> {
  try {
    const data = await unwrap<MonnifyTransferResponse & { status?: string }>(
      monnify.get('/api/v2/disbursements/single/summary', {
        headers: await authHeaders(),
        params: { reference },
      }),
    );
    const status = String(data.status ?? '').toUpperCase();
    if (['SUCCESSFUL', 'SUCCESS', 'PAID', 'COMPLETED'].includes(status)) return 'SUCCESS';
    if (['FAILED', 'REVERSED', 'REJECTED'].includes(status)) return 'FAILED';
    return 'PENDING';
  } catch {
    return 'PENDING';
  }
}

export function verifyMonnifyWebhookSignature(payload: Record<string, unknown>, signature?: string) {  const secret = env.MONNIFY_WEBHOOK_SECRET || env.MONNIFY_SECRET_KEY;
  const isSandbox = env.NODE_ENV !== 'production' || env.MONNIFY_BASE_URL.includes('sandbox');

  if (!secret || !signature) {
    if (isSandbox) return true;
    return false;
  }

  // Official Monnify SHA-512 signature formula: SHA512(clientSecret + "|" + body)
  const hashString = `${secret}|${JSON.stringify(payload)}`;
  const computedHash = crypto.createHash('sha512').update(hashString).digest('hex');

  if (computedHash.toLowerCase() === signature.toLowerCase()) {
    return true;
  }

  // Fallback check using HMAC-SHA512
  const hmacHash = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
  if (hmacHash.toLowerCase() === signature.toLowerCase()) {
    return true;
  }

  if (isSandbox) return true;

  return false;
}

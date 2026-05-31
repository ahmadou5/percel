import axios, { AxiosError } from 'axios';

import { PaymentError } from '../utils/errors.js';

type InitializeResponse = {
  authorization_url: string;
  reference: string;
};

type CustomerResponse = {
  customer_code: string;
};

type DedicatedNubanResponse = {
  account_number: string;
  account_name?: string;
  bank?: {
    name?: string;
    slug?: string;
  };
  currency?: string;
};

type BankResolveResponse = {
  account_number: string;
  account_name: string;
};

type BankListItem = {
  name?: string;
  slug?: string;
  code?: string;
  longcode?: string;
  country?: string;
  currency?: string;
  type?: string;
};

type TransferRecipientResponse = {
  recipient_code: string;
  details?: {
    account_name?: string | null;
    account_number?: string | null;
    bank_code?: string | null;
    bank_name?: string | null;
  };
};

const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY ?? ''}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

function wrapPaystackError(error: unknown): never {
  if (error instanceof AxiosError) {
    throw new PaymentError(error.response?.data?.message ?? 'Paystack request failed');
  }
  throw new PaymentError('Paystack request failed');
}

export async function initializeTransaction(
  email: string,
  amount: number,
  reference: string,
  metadata: Record<string, unknown>,
  callbackUrl?: string,
): Promise<InitializeResponse> {
  try {
    const { data } = await paystack.post('/transaction/initialize', {
      email,
      amount,
      reference,
      metadata,
      callback_url: callbackUrl,
    });

    return data.data;
  } catch (error) {
    wrapPaystackError(error);
  }
}

export async function verifyTransaction(reference: string) {
  try {
    const { data } = await paystack.get(`/transaction/verify/${reference}`);
    return data.data;
  } catch (error) {
    wrapPaystackError(error);
  }
}

export async function createCustomer(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) {
  try {
    const { data: response } = await paystack.post('/customer', {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
    });

    return response.data as CustomerResponse;
  } catch (error) {
    wrapPaystackError(error);
  }
}

export async function createDedicatedNUBAN(customerId: string, preferredBank?: string) {
  try {
    const { data } = await paystack.post('/dedicated_account', {
      customer: customerId,
      preferred_bank: preferredBank,
    });
    return data.data as DedicatedNubanResponse;
  } catch (error) {
    wrapPaystackError(error);
  }
}

export async function resolveAccountNumber(accountNumber: string, bankCode: string) {
  try {
    const { data } = await paystack.get('/bank/resolve', {
      params: { account_number: accountNumber, bank_code: bankCode },
    });

    return data.data as BankResolveResponse;
  } catch (error) {
    wrapPaystackError(error);
  }
}

export async function createTransferRecipient(data: {
  name: string;
  accountNumber: string;
  bankCode: string;
  currency?: 'NGN';
}) {
  try {
    const { data: response } = await paystack.post('/transferrecipient', {
      type: 'nuban',
      name: data.name,
      account_number: data.accountNumber,
      bank_code: data.bankCode,
      currency: data.currency ?? 'NGN',
    });

    return response.data as TransferRecipientResponse;
  } catch (error) {
    wrapPaystackError(error);
  }
}

export async function initiateTransfer(data: {
  recipient: string;
  amount: number;
  reference: string;
  reason?: string;
  currency?: 'NGN';
}) {
  try {
    const { data: response } = await paystack.post('/transfer', {
      source: 'balance',
      recipient: data.recipient,
      amount: Math.round(data.amount * 100),
      reference: data.reference,
      reason: data.reason,
      currency: data.currency ?? 'NGN',
    });

    return response.data as {
      status?: string;
      transfer_code?: string;
      reference?: string;
      recipient?: unknown;
    };
  } catch (error) {
    wrapPaystackError(error);
  }
}

export async function initiateBillsCharge(
  type: 'airtime' | 'data' | 'electricity',
  customer: string,
  amount: number,
  code: string,
) {
  try {
    const { data } = await paystack.post('/charge', {
      email: customer,
      amount,
      metadata: {
        custom_fields: [{ variable_name: 'bill_type', value: type }],
      },
      mobile_money: {
        phone: customer,
        provider: code,
      },
    });
    return data.data;
  } catch (error) {
    wrapPaystackError(error);
  }
}

export async function getBank(bankCode: string) {
  try {
    const { data } = await paystack.get('/bank', { params: { code: bankCode } });
    return data.data;
  } catch (error) {
    wrapPaystackError(error);
  }
}

export async function listBanks(country = 'nigeria') {
  try {
    const { data } = await paystack.get('/bank', {
      params: {
        country,
        pay_with_bank_transfer: true,
      },
    });

    return data.data as BankListItem[];
  } catch (error) {
    wrapPaystackError(error);
  }
}

import axios, { AxiosError } from 'axios';

import { PaymentError } from '../utils/errors';

type InitializeResponse = {
  authorization_url: string;
  reference: string;
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

export async function createDedicatedNUBAN(customerId: string, preferredBank?: string) {
  try {
    const { data } = await paystack.post('/dedicated_account', {
      customer: customerId,
      preferred_bank: preferredBank,
    });
    return data.data;
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

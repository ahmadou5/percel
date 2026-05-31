import axios, { AxiosError } from 'axios';

import { PaymentError } from '../utils/errors.js';

const vtpass = axios.create({
  baseURL: 'https://vtpass.com/api',
  auth: {
    username: process.env.VTPASS_USERNAME ?? '',
    password: process.env.VTPASS_PASSWORD ?? '',
  },
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

type VtpassEnvelope<T> = {
  response_description?: string;
  code?: string;
  requestId?: string;
  amount?: number;
  transaction_date?: string;
  purchased_code?: string;
  content?: T;
};

type VtpassService = {
  serviceID: string;
  name: string;
  minimium_amount?: string;
  maximum_amount?: string;
  product_type?: string;
  image?: string;
};

type VtpassVariation = {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice?: string;
};

type VtpassValidation = {
  Customer_Name?: string;
  Address?: string;
  Meter_Number?: string;
  MeterNumber?: string;
  Account_Number?: string;
  Can_Vend?: string;
  Meter_Type?: string;
  WrongBillersCode?: boolean;
  Min_Purchase_Amount?: number | string;
  Customer_Account_Type?: string;
  commission_details?: {
    amount?: number | null;
    rate?: string;
    rate_type?: string;
    computation_type?: string;
  };
};

function wrap(error: unknown): never {
  if (error instanceof AxiosError) {
    throw new PaymentError(error.response?.data?.response_description ?? error.response?.data?.message ?? 'VTpass request failed');
  }
  throw new PaymentError('VTpass request failed');
}

function requestId(prefix: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date()).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const time = `${parts.year ?? ''}${parts.month ?? ''}${parts.day ?? ''}${parts.hour ?? ''}${parts.minute ?? ''}`;
  return `${time}${prefix}${Math.floor(Math.random() * 1000)}`;
}

export async function listServices(identifier: string) {
  try {
    const { data } = await vtpass.get<VtpassEnvelope<VtpassService[]>>('/services', { params: { identifier } });
    return data.content ?? [];
  } catch (error) {
    wrap(error);
  }
}

export async function listVariations(serviceID: string) {
  try {
    const { data } = await vtpass.get<VtpassEnvelope<{ serviceID: string; ServiceName?: string; variations: VtpassVariation[] }>>('/service-variations', {
      params: { serviceID },
    });
    return data.content?.variations ?? [];
  } catch (error) {
    wrap(error);
  }
}

export async function validateBillersCode(serviceID: string, billersCode: string, type?: 'prepaid' | 'postpaid') {
  try {
    const { data } = await vtpass.post<VtpassEnvelope<VtpassValidation>>('/merchant-verify', {
      billersCode,
      serviceID,
      type,
    });
    return data.content ?? {};
  } catch (error) {
    wrap(error);
  }
}

export async function payUtility(payload: {
  serviceID: string;
  billersCode: string;
  variation_code?: string;
  amount?: number;
  phone: string;
  type?: 'prepaid' | 'postpaid';
}) {
  try {
    const { data } = await vtpass.post<VtpassEnvelope<Record<string, unknown>>>('/pay', {
      request_id: requestId(payload.serviceID.replace(/[^a-z0-9]/gi, '').slice(0, 4)),
      serviceID: payload.serviceID,
      billersCode: payload.billersCode,
      variation_code: payload.variation_code,
      amount: payload.amount,
      phone: payload.phone,
      type: payload.type,
    });
    return data;
  } catch (error) {
    wrap(error);
  }
}

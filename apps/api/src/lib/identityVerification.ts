import crypto from 'node:crypto';

import axios from 'axios';

import { env } from '../config/env.js';

export type IdentityProviderName = 'SMILE' | 'DOJAH' | 'PREMBLY' | 'NONE';
export type IdentityCheckType = 'NIN' | 'BVN';

export type VerificationResult = {
  verified: boolean;
  name: string | null;
  dob: string | null;
  photo: string | null;
  message?: string;
};

export function normalizeIdentityProvider(value?: string | null): IdentityProviderName {
  const upper = value?.trim().toUpperCase();
  if (upper === 'SMILE' || upper === 'DOJAH' || upper === 'PREMBLY') return upper;
  return 'NONE';
}

function simulatedAllowed() {
  return env.NODE_ENV !== 'production' && process.env.IDENTITY_SIMULATE === 'true';
}

function tokensOf(value?: string | null) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function namesOverlap(providedFirst?: string | null, providedLast?: string | null, recordName?: string | null) {
  const given = new Set([...tokensOf(providedFirst), ...tokensOf(providedLast)]);
  const record = new Set(tokensOf(recordName));
  if (given.size === 0) return true;
  for (const token of given) {
    if (token.length >= 3 && record.has(token)) return true;
  }
  return false;
}

function dobMatches(expected?: string | null, actual?: string | null) {
  if (!expected || !actual) return true;
  return expected.slice(0, 10) === String(actual).slice(0, 10);
}

type SmileResponse = {
  Verified?: boolean;
  verified?: boolean;
  Name?: string;
  name?: string;
  DOB?: string;
  dob?: string;
  Photo?: string;
  photo?: string;
  ResultText?: string;
  ResultCode?: string;
  message?: string;
};

async function verifyWithSmile(type: IdentityCheckType, number: string, firstName?: string, lastName?: string, dob?: string): Promise<VerificationResult> {
  const hasPartnerId = Boolean(
    env.SMILE_IDENTITY_PARTNER_ID &&
    !env.SMILE_IDENTITY_PARTNER_ID.includes('placeholder') &&
    env.SMILE_IDENTITY_PARTNER_ID !== '000' &&
    env.SMILE_IDENTITY_PARTNER_ID.trim().length > 0
  );
  const hasApiKey = Boolean(
    env.SMILE_IDENTITY_API_KEY &&
    !env.SMILE_IDENTITY_API_KEY.includes('placeholder') &&
    env.SMILE_IDENTITY_API_KEY.trim().length > 0
  );

  if (!hasPartnerId || !hasApiKey) {
    if (simulatedAllowed()) {
      return { verified: true, name: `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Verified Identity', dob: dob ?? null, photo: null, message: 'Verification approved (Simulated mode)' };
    }
    return { verified: false, name: null, dob: null, photo: null, message: 'Smile Identity credentials are not configured. Contact support.' };
  }

  try {
    const response = await axios.post(
      'https://testapi.smileidentity.com/v1/id_verification',
      { partner_id: env.SMILE_IDENTITY_PARTNER_ID, id_type: type, id_number: number, first_name: firstName, last_name: lastName, dob },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-smile-partner-id': env.SMILE_IDENTITY_PARTNER_ID,
          'x-smile-signature': crypto.createHmac('sha256', env.SMILE_IDENTITY_API_KEY).update(JSON.stringify({ partner_id: env.SMILE_IDENTITY_PARTNER_ID, id_type: type, id_number: number, first_name: firstName, last_name: lastName, dob })).digest('hex'),
        },
        timeout: 30_000,
      },
    );
    const data = response.data as SmileResponse;
    return {
      verified: Boolean(data.Verified ?? data.verified ?? false),
      name: (data.Name ?? data.name ?? null) as string | null,
      dob: (data.DOB ?? data.dob ?? null) as string | null,
      photo: (data.Photo ?? data.photo ?? null) as string | null,
      message: data.ResultText ?? data.message ?? data.ResultCode ?? undefined,
    };
  } catch (err) {
    const detail =
      axios.isAxiosError(err) && err.response
        ? `Verification service rejected the request (${err.response.status})`
        : 'Verification service is unavailable. Please try again later.';
    return { verified: false, name: null, dob: null, photo: null, message: detail };
  }
}

type DojahEntity = {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  date_of_birth?: string;
  photo?: string;
};

async function dojahLookup(endpoint: '/kyc/nin' | '/kyc/bvn', body: Record<string, unknown>): Promise<DojahEntity> {
  const response = await axios.post(`https://api.dojah.io${endpoint}`, body, {
    headers: {
      AppId: process.env.DOJAH_APP_ID ?? '',
      Authorization: process.env.DOJAH_SECRET_KEY ?? '',
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
  return (response.data?.entity ?? {}) as DojahEntity;
}

type PremblyResponse = {
  detail?: string;
  verification?: {
    status?: boolean;
    nin_data?: { first_name?: string; last_name?: string; date_of_birth?: string; photo?: string };
    bvn_data?: { first_name?: string; last_name?: string; date_of_birth?: string; image?: string };
  };
};

async function premblyLookup(check: 'nin_verify' | 'bvn_verify', body: Record<string, unknown>): Promise<PremblyResponse> {
  const response = await axios.post(
    `https://identitypass.prembly.com/api/v2/biometrics/merchant/data/verification/${check}`,
    body,
    {
      headers: {
        'x-api-key': process.env.PREMBLY_API_KEY ?? '',
        app_id: process.env.PREMBLY_APP_ID ?? '',
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    },
  );
  return response.data as PremblyResponse;
}

export async function verifyIdentity(opts: {
  provider: IdentityProviderName;
  type: IdentityCheckType;
  number: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
}): Promise<VerificationResult> {
  const { provider, type, number, firstName, lastName, dob } = opts;

  if (provider === 'NONE') {
    if (simulatedAllowed()) {
      return { verified: true, name: `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Verified Identity', dob: dob ?? null, photo: null, message: 'Verification approved (Simulated mode)' };
    }
    if (type === 'BVN') {
      // Product policy: BVN is the baseline tier. Bank rails validate it again when
      // creating virtual accounts / disbursing payouts, so self-assertion is accepted.
      return { verified: true, name: `${firstName ?? ''} ${lastName ?? ''}`.trim() || null, dob: dob ?? null, photo: null, message: 'BVN accepted without third-party verification.' };
    }
    return { verified: false, name: null, dob: null, photo: null, message: 'No identity provider is configured yet. NIN verification is coming soon.' };
  }

  if (simulatedAllowed()) {
    return { verified: true, name: `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Verified Identity', dob: dob ?? null, photo: null, message: 'Verification approved (Simulated mode)' };
  }

  if (provider === 'SMILE') {
    return verifyWithSmile(type, number, firstName, lastName, dob);
  }

  try {
    if (provider === 'DOJAH') {
      const entity = type === 'NIN'
        ? await dojahLookup('/kyc/nin', { nin: number })
        : await dojahLookup('/kyc/bvn', { bvn: number });

      const recordName = [entity.first_name, entity.middle_name, entity.last_name].filter(Boolean).join(' ');
      const verified = namesOverlap(firstName, lastName, recordName) && dobMatches(dob, entity.date_of_birth);
      return {
        verified,
        name: recordName || null,
        dob: entity.date_of_birth ?? null,
        photo: entity.photo ?? null,
        message: verified ? undefined : 'Details did not match the records. Check your name and date of birth.',
      };
    }

    const data = type === 'NIN'
      ? await premblyLookup('nin_verify', { number, first_name: firstName, last_name: lastName })
      : await premblyLookup('bvn_verify', { number });

    const record = (data.verification?.nin_data ?? data.verification?.bvn_data) as
      | { first_name?: string; last_name?: string; date_of_birth?: string; photo?: string; image?: string }
      | undefined;
    const recordName = [record?.first_name, record?.last_name].filter(Boolean).join(' ');
    const verified = Boolean(data.verification?.status) && namesOverlap(firstName, lastName, recordName) && dobMatches(dob, record?.date_of_birth);
    return {
      verified,
      name: recordName || null,
      dob: record?.date_of_birth ?? null,
      photo: record?.photo ?? record?.image ?? null,
      message: verified ? data.detail : data.detail || 'Details did not match the records.',
    };
  } catch (err) {
    const detail =
      axios.isAxiosError(err) && err.response
        ? `${provider} rejected the request (${err.response.status})`
        : `${provider} is unavailable. Please try again later.`;
    return { verified: false, name: null, dob: null, photo: null, message: detail };
  }
}

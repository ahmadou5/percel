import crypto from 'node:crypto';

import axios from 'axios';

import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

type SmileIdentityResponse = {
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

export type VerificationResult = {
  verified: boolean;
  name: string | null;
  dob: string | null;
  photo: string | null;
  message?: string;
};

function signPayload(payload: Record<string, unknown>) {
  const canonical = JSON.stringify(payload);
  return crypto.createHmac('sha256', env.SMILE_IDENTITY_API_KEY).update(canonical).digest('hex');
}

function normalizeResponse(data: SmileIdentityResponse): VerificationResult {
  return {
    verified: Boolean(data.Verified ?? data.verified ?? false),
    name: (data.Name ?? data.name ?? null) as string | null,
    dob: (data.DOB ?? data.dob ?? null) as string | null,
    photo: (data.Photo ?? data.photo ?? null) as string | null,
    message: data.ResultText ?? data.message ?? data.ResultCode ?? undefined,
  };
}

async function postVerification(payload: Record<string, unknown>) {
  try {
    const response = await axios.post('https://testapi.smileidentity.com/v1/id_verification', payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-smile-partner-id': env.SMILE_IDENTITY_PARTNER_ID,
        'x-smile-signature': signPayload(payload),
      },
      timeout: 30_000,
    });

    return normalizeResponse(response.data as SmileIdentityResponse);
  } catch {
    throw new AppError('KYC verification failed', 502, 'KYC_VERIFICATION_FAILED', true);
  }
}

export async function verifyNIN(
  partnerId: string,
  nin: string,
  firstName: string,
  lastName: string,
  dob: string,
) {
  return postVerification({
    partner_id: partnerId,
    id_type: 'NIN',
    id_number: nin,
    first_name: firstName,
    last_name: lastName,
    dob,
  });
}

export async function verifyBVN(
  partnerId: string,
  bvn: string,
  firstName: string,
  lastName: string,
  dob: string,
) {
  return postVerification({
    partner_id: partnerId,
    id_type: 'BVN',
    id_number: bvn,
    first_name: firstName,
    last_name: lastName,
    dob,
  });
}

export async function submitJobForReview(
  partnerId: string,
  jobId: string,
  images: Array<{ type: string; url: string }>,
) {
  return postVerification({
    partner_id: partnerId,
    job_id: jobId,
    images,
  });
}

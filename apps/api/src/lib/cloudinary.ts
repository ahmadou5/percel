import crypto from 'node:crypto';

import { env } from '../config/env.js';
import { AppError, PaymentError } from '../utils/errors.js';

type UploadOptions = {
  folder: string;
  publicId?: string;
  transformation?: string;
  format?: 'webp';
};

function signParams(params: Record<string, string>) {
  const signaturePayload = Object.entries(params)
    .filter(([, value]) => value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHash('sha1').update(`${signaturePayload}${env.CLOUDINARY_API_SECRET}`).digest('hex');
}

export async function uploadImageBuffer(
  buffer: Buffer,
  options: UploadOptions,
): Promise<{ secure_url: string; public_id: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const format = options.format ?? 'webp';
  const transformation = options.transformation ?? 'c_limit,q_auto,w_1600';

  const signature = signParams({
    folder: options.folder,
    format,
    public_id: options.publicId ?? '',
    timestamp,
    transformation,
  });

  const form = new FormData();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.append('file', new Blob([arrayBuffer]), 'upload.webp');
  form.append('api_key', env.CLOUDINARY_API_KEY);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('folder', options.folder);
  form.append('format', format);
  form.append('transformation', transformation);

  if (options.publicId) {
    form.append('public_id', options.publicId);
  }

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });

    const data = (await response.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } };
    if (response.ok && data.secure_url && data.public_id) {
      return {
        secure_url: data.secure_url,
        public_id: data.public_id,
      };
    }
    throw new PaymentError(data.error?.message ?? 'Image upload failed');
  } catch (err) {
    if (err instanceof PaymentError) throw err;
    throw new PaymentError('Image upload failed. Check your connection and try again.');
  }
}


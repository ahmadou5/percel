import crypto from 'node:crypto';

import { env } from '../config/env';
import { AppError } from '../utils/errors';

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

  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new AppError('Cloudinary upload failed', 502, 'CLOUDINARY_UPLOAD_FAILED', true);
  }

  const data = (await response.json()) as { secure_url?: string; public_id?: string };
  if (!data.secure_url || !data.public_id) {
    throw new AppError('Cloudinary upload failed', 502, 'CLOUDINARY_UPLOAD_FAILED', true);
  }

  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
  };
}

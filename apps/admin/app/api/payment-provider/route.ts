import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/lib/session';

const apiUrl = process.env.PERCEL_API_URL ?? 'https://percelapi-production-4ab1.up.railway.app';

async function getToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

async function proxy(method: 'GET' | 'PUT', body?: unknown) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });

  const response = await fetch(`${apiUrl}/api/v1/admin/payment-provider`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload ?? { message: 'Payment provider request failed' }, { status: response.status });
}

export async function GET() {
  return proxy('GET');
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  return proxy('PUT', body);
}

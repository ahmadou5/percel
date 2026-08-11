import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/lib/session';

const apiUrl = process.env.PERCEL_API_URL ?? 'https://percelapi-production-4ab1.up.railway.app';

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });

  const response = await fetch(`${apiUrl}/api/v1/admin/broadcast`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload ?? { message: 'Broadcast request failed' }, { status: response.status });
}

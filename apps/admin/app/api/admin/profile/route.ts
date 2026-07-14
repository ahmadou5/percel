import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE, SESSION_USER_COOKIE } from '@/lib/session';

const API_BASE = process.env.PERCEL_API_URL ?? 'http://localhost:3000';

async function getToken() {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function GET() {
  const jar = await cookies();
  const userRaw = jar.get(SESSION_USER_COOKIE)?.value;
  if (!userRaw) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }
  try {
    const user = JSON.parse(userRaw);
    return NextResponse.json({ data: user });
  } catch {
    return NextResponse.json({ message: 'Invalid session data' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const response = await fetch(`${API_BASE}/api/v1/user/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json(payload ?? { message: 'Update failed' }, { status: response.status });
  }

  // Refresh the session user cookie with updated data
  const updatedUser = payload?.data ?? body;
  const res = NextResponse.json({ success: true, data: updatedUser });
  res.cookies.set(SESSION_USER_COOKIE, JSON.stringify(updatedUser), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  return res;
}

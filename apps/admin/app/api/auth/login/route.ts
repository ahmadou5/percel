import dns from 'node:dns';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE, SESSION_USER_COOKIE } from '@/lib/session';

dns.setDefaultResultOrder('ipv4first');

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;

  if (!body?.email || !body.password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
  }

  const apiUrl = process.env.PERCEL_API_URL ?? 'http://localhost:3000';
  const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: body.email, password: body.password }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json(payload ?? { message: 'Unable to sign in' }, { status: response.status });
  }

  const token = payload?.data?.tokens?.accessToken ?? payload?.data?.accessToken;
  const user = payload?.data?.user ?? null;

  if (!token) {
    return NextResponse.json({ message: 'Missing access token from auth response' }, { status: 500 });
  }

  const res = NextResponse.json({ success: true, user });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 2 * 60 * 60, // 2 hours
  });

  if (user) {
    res.cookies.set(SESSION_USER_COOKIE, JSON.stringify(user), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 2 * 60 * 60, // 2 hours
    });
  }

  return res;
}

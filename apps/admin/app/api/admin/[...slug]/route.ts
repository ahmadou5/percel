import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/lib/session';

const apiUrl = process.env.PERCEL_API_URL ?? 'http://localhost:3000';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return proxy(request, 'POST', slug);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return proxy(request, 'PUT', slug);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return proxy(request, 'PATCH', slug);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return proxy(request, 'GET', slug);
}

async function proxy(request: Request, method: string, slug: string[]) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });

  const path = slug.join('/');
  
  let body: unknown = undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    body = await request.json().catch(() => null);
  }

  const response = await fetch(`${apiUrl}/api/v1/admin/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload ?? { message: `Request to ${path} failed` }, { status: response.status });
}

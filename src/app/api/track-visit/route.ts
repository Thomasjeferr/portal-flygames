import { NextRequest, NextResponse } from 'next/server';
import { trackVisit } from '@/services/geolocationService';

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? '0.0.0.0';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { pagePath?: string; referrer?: string };
    const pagePath = typeof body.pagePath === 'string' && body.pagePath.trim() ? body.pagePath.trim() : '/';
    const referrer = typeof body.referrer === 'string' ? body.referrer.trim() || null : null;
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent');

    await trackVisit({
      ip,
      userAgent,
      pagePath: pagePath.slice(0, 500),
      referrer: referrer ? referrer.slice(0, 500) : null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

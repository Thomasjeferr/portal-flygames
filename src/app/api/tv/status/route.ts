import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 });
  }

  const now = new Date();
  const authCode = await prisma.tvAuthCode.findUnique({
    where: { code },
    include: { tvSession: true },
  });

  const addCors = (r: NextResponse) => {
    r.headers.set('Access-Control-Allow-Origin', '*');
    return r;
  };

  if (!authCode) {
    return addCors(NextResponse.json({ status: 'invalid', message: 'Código inválido' }));
  }
  if (authCode.expiresAt < now) {
    return addCors(NextResponse.json({ status: 'expired', message: 'Código expirado' }));
  }
  if (!authCode.usedAt || !authCode.tvSessionId) {
    return addCors(NextResponse.json({ status: 'pending' }));
  }

  const session = authCode.tvSession;
  if (!session || session.expiresAt < now) {
    return addCors(NextResponse.json({ status: 'expired', message: 'Sessão expirada' }));
  }

  return addCors(NextResponse.json({
    status: 'authorized',
    tvSessionToken: session.token,
    deviceId: session.deviceId,
    expiresAt: session.expiresAt.toISOString(),
  }));
}

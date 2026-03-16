import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateTvDeviceId, TV_SESSION_HOURS } from '@/lib/tv-session';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Faça login para autorizar a TV' }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }
  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 });
  }

  const now = new Date();
  const authCode = await prisma.tvAuthCode.findUnique({
    where: { code },
  });

  if (!authCode) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
  }
  if (authCode.expiresAt < now) {
    return NextResponse.json({ error: 'Código expirado. Gere um novo na TV.' }, { status: 400 });
  }
  if (authCode.usedAt) {
    return NextResponse.json({ error: 'Este código já foi utilizado' }, { status: 400 });
  }

  const deviceId = generateTvDeviceId();
  const token = `tvt_${randomBytes(32).toString('hex')}`;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TV_SESSION_HOURS);

  const tvSession = await prisma.tvSession.create({
    data: {
      userId: session.userId,
      token,
      deviceId,
      expiresAt,
    },
  });

  await prisma.tvAuthCode.update({
    where: { id: authCode.id },
    data: { usedAt: now, tvSessionId: tvSession.id },
  });

  return NextResponse.json({
    success: true,
    message: 'TV autorizada com sucesso.',
    expiresAt: expiresAt.toISOString(),
  });
}

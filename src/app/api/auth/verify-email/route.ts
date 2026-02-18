import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashToken } from '@/lib/email/tokenUtils';
import { checkVerifyEmailRateLimit, incrementVerifyEmailRateLimit } from '@/lib/email/rateLimit';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  code: z.string().length(6, 'Código deve ter 6 dígitos'),
});

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkVerifyEmailRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });
    }

    const { email, code } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ error: 'E-mail não encontrado.' }, { status: 400 });
    }

    const tokenHash = hashToken(code.trim());

    const emailToken = await prisma.emailToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        type: 'VERIFY_EMAIL',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!emailToken) {
      await incrementVerifyEmailRateLimit(ip);
      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 });
    }

    await incrementVerifyEmailRateLimit(ip);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
      prisma.emailToken.update({
        where: { id: emailToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message: 'E-mail verificado com sucesso.' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao verificar e-mail' }, { status: 500 });
  }
}

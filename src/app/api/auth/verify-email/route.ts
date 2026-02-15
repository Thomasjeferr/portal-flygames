import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashToken } from '@/lib/email/tokenUtils';

const schema = z.object({ token: z.string().min(1, 'Token obrigatório') });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Token inválido' }, { status: 400 });
    }

    const tokenHash = hashToken(parsed.data.token);

    const emailToken = await prisma.emailToken.findFirst({
      where: {
        tokenHash,
        type: 'VERIFY_EMAIL',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!emailToken) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: emailToken.userId },
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

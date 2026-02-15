import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { hashToken } from '@/lib/email/tokenUtils';
import { sendTransactionalEmail } from '@/lib/email/emailService';

const schema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const emailToken = await prisma.emailToken.findFirst({
      where: {
        tokenHash,
        type: 'RESET_PASSWORD',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!emailToken) {
      return NextResponse.json({ error: 'Link inválido ou expirado. Solicite novamente.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: emailToken.userId },
      data: { passwordHash },
    });

    await prisma.emailToken.update({
      where: { id: emailToken.id },
      data: { usedAt: new Date() },
    });

    const settings = await prisma.emailSettings.findFirst();
    const supportUrl = settings?.supportEmail ? `mailto:${settings.supportEmail}` : (settings?.appBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

    await sendTransactionalEmail({
      to: emailToken.user.email,
      templateKey: 'PASSWORD_CHANGED',
      vars: {
        name: emailToken.user.name || emailToken.user.email.split('@')[0],
        support_url: supportUrl,
      },
      userId: emailToken.userId,
    });

    return NextResponse.json({ message: 'Senha alterada com sucesso.' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao alterar senha' }, { status: 500 });
  }
}

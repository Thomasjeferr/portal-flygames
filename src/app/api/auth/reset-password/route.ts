import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { hashToken } from '@/lib/email/tokenUtils';
import { sendTransactionalEmail, normalizeAppBaseUrl } from '@/lib/email/emailService';
import { checkResetPasswordRateLimit, incrementResetPasswordRateLimit } from '@/lib/email/rateLimit';

const schema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter ao menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter ao menos um número'),
});

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkResetPasswordRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em 1 hora.' },
        { status: 429 }
      );
    }

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
      await incrementResetPasswordRateLimit(ip);
      return NextResponse.json({ error: 'Link inválido ou expirado. Solicite novamente.' }, { status: 400 });
    }

    await incrementResetPasswordRateLimit(ip);
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: emailToken.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    await prisma.emailToken.update({
      where: { id: emailToken.id },
      data: { usedAt: new Date() },
    });

    const settings = await prisma.emailSettings.findFirst();
    const baseUrl = normalizeAppBaseUrl(settings?.appBaseUrl);
    const supportUrl = settings?.supportEmail ? `mailto:${settings.supportEmail}` : baseUrl;

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

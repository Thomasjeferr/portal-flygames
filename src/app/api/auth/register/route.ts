import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendTransactionalEmail } from '@/lib/email/emailService';
import { checkRegisterRateLimit, incrementRegisterRateLimit } from '@/lib/email/rateLimit';
import {
  generateVerificationCode,
  hashToken,
  getVerificationCodeExpiryDate,
} from '@/lib/email/tokenUtils';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter ao menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter ao menos um número'),
  name: z
    .string()
    .trim()
    .min(3, 'Informe seu nome completo'),
});

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRegisterRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 1 hora.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await incrementRegisterRateLimit(ip);
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 });
    }

    await incrementRegisterRateLimit(ip);
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        role: 'user',
      },
    });

    // Enviamos apenas o código de verificação. O e-mail de boas-vindas (WELCOME) é enviado em verify-email após ativar a conta.
    const code = generateVerificationCode();
    const tokenHash = hashToken(code);
    const expiresAt = getVerificationCodeExpiryDate();
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        type: 'VERIFY_EMAIL',
        tokenHash,
        expiresAt,
      },
    });

    const emailResult = await sendTransactionalEmail({
      to: user.email,
      templateKey: 'VERIFY_EMAIL',
      vars: {
        name: user.name || user.email.split('@')[0],
        code,
        expires_in: '15',
      },
      userId: user.id,
    });

    if (!emailResult.success) {
      console.error('[Email] VERIFY_EMAIL no cadastro:', emailResult.error);
      return NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        needsVerification: true,
        message: 'Cadastro realizado! O envio do código pode demorar alguns segundos. Se não receber em 1 minuto, use "Não recebeu? Reenviar código" na tela de verificação.',
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      needsVerification: true,
      message: 'Cadastro realizado! Verifique seu e-mail com o código de 6 dígitos.',
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao cadastrar' }, { status: 500 });
  }
}

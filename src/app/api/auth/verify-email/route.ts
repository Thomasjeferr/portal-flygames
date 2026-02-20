import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { hashToken } from '@/lib/email/tokenUtils';
import { checkVerifyEmailRateLimit, incrementVerifyEmailRateLimit } from '@/lib/email/rateLimit';
import { sendTransactionalEmail, normalizeAppBaseUrl } from '@/lib/email/emailService';

const SESSION_COOKIE = 'portal_session';
const SESSION_DAYS = 30;

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
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json({ error: 'E-mail não encontrado.' }, { status: 400 });
    }

    // E-mail de conta ativada (WELCOME) só após o usuário verificar o código; não é enviado no cadastro.
    async function sendWelcomeEmail(u: { id: string; email: string; name: string | null }) {
      const settings = await prisma.emailSettings.findFirst();
      const baseUrl = normalizeAppBaseUrl(settings?.appBaseUrl);
      const loginUrl = `${baseUrl}/entrar`;
      await sendTransactionalEmail({
        to: u.email,
        templateKey: 'WELCOME',
        vars: {
          name: u.name || u.email.split('@')[0],
          login_url: loginUrl,
        },
        userId: u.id,
      }).catch((e) => console.error('[Email] WELCOME:', e));
    }

    // Atalho de teste para conta cliente@teste.com
    if (normalizedEmail === 'cliente@teste.com' && code.trim() === '000000') {
      await incrementVerifyEmailRateLimit(ip);
      const wasUnverified = !user.emailVerified;
      if (wasUnverified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
      }
      if (wasUnverified) await sendWelcomeEmail(user);
      const token = await createSession(user.id);
      const response = NextResponse.json({
        message: 'E-mail verificado com sucesso.',
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
      response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DAYS * 24 * 60 * 60,
        path: '/',
      });
      return response;
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

    await sendWelcomeEmail(user);
    const token = await createSession(user.id);
    const response = NextResponse.json({
      message: 'E-mail verificado com sucesso.',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao verificar e-mail' }, { status: 500 });
  }
}

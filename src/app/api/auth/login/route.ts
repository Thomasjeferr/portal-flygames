import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { checkLoginRateLimit, incrementLoginRateLimit } from '@/lib/email/rateLimit';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

const SESSION_COOKIE = 'portal_session';
const SESSION_DAYS = 30;

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkLoginRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { email: rawEmail, password } = parsed.data;
    const email = rawEmail.toLowerCase();

    const isProduction = process.env.NODE_ENV === 'production';
    const adminEnvEmail = (process.env.ADMIN_EMAIL || 'admin@flygames.app').toLowerCase();
    const adminEnvPassword = process.env.ADMIN_PASSWORD;

    // Em produção, não usar senha padrão: exige ADMIN_PASSWORD definido para login admin
    if (isProduction && email === adminEnvEmail && !adminEnvPassword) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
    }

    const adminPasswordToUse = adminEnvPassword || 'Admin@123';

    let user = await prisma.user.findUnique({ where: { email } });

    // Auto-cria/atualiza admin no primeiro login se bater com ADMIN_EMAIL/ADMIN_PASSWORD (em prod exige env)
    if (!user && email === adminEnvEmail && password === adminPasswordToUse) {
      const adminHash = await bcrypt.hash(adminPasswordToUse, 12);
      user = await prisma.user.upsert({
        where: { email },
        update: { role: 'admin', passwordHash: adminHash, name: 'Administrador' },
        create: {
          email,
          name: 'Administrador',
          passwordHash: adminHash,
          role: 'admin',
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await incrementLoginRateLimit(ip);
      return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
    }

    if (!user.emailVerified && user.role !== 'admin') {
      return NextResponse.json(
        {
          error: 'Verifique seu e-mail para entrar. Enviamos um código de 6 dígitos.',
          needsVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    const token = await createSession(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword ?? false,
      },
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
    console.error('Erro no login:', e);
    const msg = process.env.NODE_ENV === 'production'
      ? 'Erro ao entrar. Tente novamente mais tarde.'
      : 'Erro ao entrar. Verifique se o banco está configurado (npm run db:push && npm run db:seed)';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

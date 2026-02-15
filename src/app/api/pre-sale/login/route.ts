import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

const schema = z.object({
  username: z.string().min(1, 'Usuário obrigatório'),
  password: z.string().min(1, 'Senha obrigatória'),
  slug: z.string().optional(),
});

const SESSION_COOKIE = 'portal_session';
const SESSION_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { username, password, slug } = parsed.data;

    const clubAccount = await prisma.clubViewerAccount.findUnique({
      where: { loginUsername: username.trim() },
      include: {
        user: true,
        preSaleClubSlot: { include: { preSaleGame: true } },
      },
    });

    if (!clubAccount) {
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 });
    }
    if (clubAccount.user.role !== 'club_viewer') {
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 });
    }

    const valid = await verifyPassword(password, clubAccount.user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 });
    }

    if (slug && clubAccount.preSaleClubSlot.preSaleGame.slug !== slug) {
      return NextResponse.json(
        { error: 'Este acesso não é válido para este jogo' },
        { status: 403 }
      );
    }

    const token = await createSession(clubAccount.user.id);

    const response = NextResponse.json({
      user: {
        id: clubAccount.user.id,
        email: clubAccount.user.email,
        name: clubAccount.user.name,
        role: clubAccount.user.role,
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
    console.error('[Pre-sale login]', e);
    return NextResponse.json({ error: 'Erro ao entrar. Tente novamente.' }, { status: 500 });
  }
}

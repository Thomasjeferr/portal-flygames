import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

/** POST: registra solicitação de cadastro de time. Requer login. */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Você precisa estar logado para solicitar um time.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const teamName = typeof body.teamName === 'string' ? body.teamName.trim() : '';
    const city = typeof body.city === 'string' ? body.city.trim() || null : null;
    const phone = typeof body.phone === 'string' ? body.phone.trim() || null : null;

    if (!teamName) {
      return NextResponse.json(
        { error: 'O nome do time é obrigatório.' },
        { status: 400 }
      );
    }

    const created = await prisma.teamRequest.create({
      data: {
        teamName,
        city,
        phone,
        userId: session.userId,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      message: 'Solicitação registrada! Você receberá um e-mail quando o time for cadastrado.',
    });
  } catch (e) {
    console.error('[POST /api/public/team-request]', e);
    return NextResponse.json({ error: 'Erro ao registrar solicitação.' }, { status: 500 });
  }
}

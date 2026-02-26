import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

const PARA_TIMES_URL_PATH = '/para-times';

/** POST: registra solicitação de cadastro de time (torcedor não encontrou o time). Pode ser anônimo ou logado. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const teamName = typeof body.teamName === 'string' ? body.teamName.trim() || null : null;

    const session = await getSession();
    const userId = session?.userId ?? null;

    const created = await prisma.teamRequest.create({
      data: {
        teamName: teamName ?? undefined,
        userId: userId ?? undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      message: 'Solicitação registrada. O portal pode entrar em contato quando o time for cadastrado.',
    });
  } catch (e) {
    console.error('[POST /api/public/team-request]', e);
    return NextResponse.json({ error: 'Erro ao registrar solicitação.' }, { status: 500 });
  }
}

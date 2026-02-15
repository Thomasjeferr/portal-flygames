import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const bodySchema = z.object({ gameId: z.string().min(1, 'gameId obrigatório') });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }
    const { gameId } = parsed.data;

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

    const session = await getSession();
    await prisma.playEvent.create({
      data: {
        gameId,
        userId: session?.userId ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[TrackPlay]', e);
    return NextResponse.json({ error: 'Erro ao registrar play' }, { status: 500 });
  }
}

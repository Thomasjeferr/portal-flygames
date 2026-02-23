import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const patchSchema = z.object({
  gameId: z.string().min(1, 'gameId obrigatório'),
  positionSeconds: z.number().int().min(0),
  durationSeconds: z.number().int().min(0).optional(),
});

/** GET ?gameId=xxx — retorna a posição salva para o jogo (para seek ao abrir). */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const gameId = request.nextUrl.searchParams.get('gameId');
  if (!gameId) {
    return NextResponse.json({ error: 'gameId obrigatório' }, { status: 400 });
  }

  const progress = await prisma.watchProgress.findUnique({
    where: {
      userId_gameId: { userId: session.userId, gameId },
    },
  });

  if (!progress) {
    return NextResponse.json({ positionSeconds: 0 });
  }

  return NextResponse.json({
    positionSeconds: progress.positionSeconds,
    durationSeconds: progress.durationSeconds ?? undefined,
  });
}

/** PATCH — salva/atualiza a posição de visualização (chamado periodicamente pelo player). */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Dados inválidos';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { gameId, positionSeconds, durationSeconds } = parsed.data;

  // Garantir que o jogo existe
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  }

  await prisma.watchProgress.upsert({
    where: {
      userId_gameId: { userId: session.userId, gameId },
    },
    create: {
      userId: session.userId,
      gameId,
      positionSeconds,
      durationSeconds: durationSeconds ?? null,
    },
    update: {
      positionSeconds,
      ...(durationSeconds !== undefined && { durationSeconds }),
    },
  });

  return NextResponse.json({ ok: true });
}

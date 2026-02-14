import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { SESSION_TTL_SECONDS } from '@/lib/pre-sale/enums';

const schema = z.object({
  slug: z.string().min(1),
  clubCode: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const { slug, clubCode } = parsed.data;

    const game = await prisma.preSaleGame.findUnique({
      where: { slug },
      include: { clubSlots: true },
    });
    if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
    if (game.status !== 'PUBLISHED') return NextResponse.json({ error: 'Jogo ainda não publicado' }, { status: 400 });
    if (!game.videoUrl) return NextResponse.json({ error: 'Vídeo não disponível' }, { status: 400 });

    const slot = game.clubSlots.find((s) => s.clubCode === clubCode.trim());
    if (!slot) return NextResponse.json({ error: 'Código do clube inválido' }, { status: 400 });
    if (slot.paymentStatus !== 'PAID') return NextResponse.json({ error: 'Pagamento não confirmado' }, { status: 400 });

    const now = new Date();
    const activeCount = await prisma.clubStreamSession.count({
      where: {
        preSaleGameId: game.id,
        clubCode: clubCode.trim(),
        expiresAt: { gt: now },
      },
    });
    if (activeCount >= game.maxSimultaneousPerClub) {
      return NextResponse.json(
        { error: `Limite de ${game.maxSimultaneousPerClub} dispositivos simultâneos atingido` },
        { status: 403 }
      );
    }

    const sessionToken = `pss_${randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

    await prisma.clubStreamSession.create({
      data: {
        preSaleGameId: game.id,
        clubCode: clubCode.trim(),
        sessionToken,
        lastHeartbeatAt: now,
        expiresAt,
      },
    });

    return NextResponse.json({ sessionToken, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao iniciar sessão' }, { status: 500 });
  }
}

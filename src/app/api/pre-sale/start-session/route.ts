import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { SESSION_TTL_SECONDS } from '@/lib/pre-sale/enums';

const schema = z.object({
  slug: z.string().min(1),
  clubCode: z.string().optional(),
  useSession: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const { slug, clubCode: bodyClubCode, useSession } = parsed.data;

    const game = await prisma.preSaleGame.findUnique({
      where: { slug },
      include: { clubSlots: true },
    });
    if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
    if (game.status !== 'PUBLISHED') return NextResponse.json({ error: 'Jogo ainda não publicado' }, { status: 400 });
    if (!game.videoUrl) return NextResponse.json({ error: 'Vídeo não disponível' }, { status: 400 });

    let slot: { id: string; clubCode: string; paymentStatus: string } | null = null;

    if (useSession) {
      const session = await getSession();
      if (!session || session.role !== 'club_viewer') {
        return NextResponse.json({ error: 'Faça login com o usuário do clube' }, { status: 401 });
      }
      const clubAccount = await prisma.clubViewerAccount.findFirst({
        where: {
          userId: session.userId,
          preSaleClubSlot: { preSaleGameId: game.id },
        },
        include: { preSaleClubSlot: true },
      });
      if (!clubAccount) {
        return NextResponse.json({ error: 'Este acesso não é válido para este jogo' }, { status: 403 });
      }
      slot = clubAccount.preSaleClubSlot;
    } else if (bodyClubCode?.trim()) {
      slot = game.clubSlots.find((s) => s.clubCode === bodyClubCode.trim()) ?? null;
    }

    if (!slot) return NextResponse.json({ error: 'Código do clube inválido' }, { status: 400 });
    if (slot.paymentStatus !== 'PAID') return NextResponse.json({ error: 'Pagamento não confirmado' }, { status: 400 });

    const clubCode = slot.clubCode;

    const now = new Date();
    const activeCount = await prisma.clubStreamSession.count({
      where: {
        preSaleGameId: game.id,
        clubCode,
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
        clubCode,
        sessionToken,
        lastHeartbeatAt: now,
        expiresAt,
      },
    });

    return NextResponse.json({ sessionToken, expiresAt: expiresAt.toISOString(), clubCode });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao iniciar sessão' }, { status: 500 });
  }
}

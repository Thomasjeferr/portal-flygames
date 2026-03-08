import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** GET /api/lives/[liveId]/likes – retorna contagem e se o usuário logado curtiu. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  try {
    const { liveId } = await params;
    if (!liveId) return NextResponse.json({ error: 'liveId obrigatório' }, { status: 400 });
    const session = await getSession();
    const [count, userLike] = await Promise.all([
      prisma.liveLike.count({ where: { liveId } }),
      session
        ? prisma.liveLike.findUnique({
            where: { liveId_userId: { liveId, userId: session.userId } },
            select: { id: true },
          })
        : null,
    ]);
    return NextResponse.json({ count, userLiked: !!userLike });
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar curtidas' }, { status: 500 });
  }
}

/** POST /api/lives/[liveId]/likes – toggle curtida (exige login). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Faça login para curtir' }, { status: 401 });
    const { liveId } = await params;
    if (!liveId) return NextResponse.json({ error: 'liveId obrigatório' }, { status: 400 });
    const live = await prisma.live.findUnique({ where: { id: liveId }, select: { id: true } });
    if (!live) return NextResponse.json({ error: 'Live não encontrada' }, { status: 404 });
    const existing = await prisma.liveLike.findUnique({
      where: { liveId_userId: { liveId, userId: session.userId } },
    });
    if (existing) {
      await prisma.liveLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }
    await prisma.liveLike.create({
      data: { liveId, userId: session.userId },
    });
    return NextResponse.json({ liked: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao processar curtida' }, { status: 500 });
  }
}

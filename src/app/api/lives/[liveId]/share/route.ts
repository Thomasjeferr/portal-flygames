import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** POST /api/lives/[liveId]/share – registra um compartilhamento (incrementa contador). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params;
  if (!liveId) return NextResponse.json({ error: 'liveId obrigatório' }, { status: 400 });
  try {
    await prisma.live.update({
      where: { id: liveId },
      data: { shareCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Live não encontrada' }, { status: 404 });
  }
}

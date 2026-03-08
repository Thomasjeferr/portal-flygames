import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** PATCH /api/admin/comments/[id] – aprovar ou rejeitar. Body: { status: 'approved' | 'rejected', entityType: 'game' | 'live' }. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const { id } = await params;
  let body: { status?: string; entityType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }
  const status = body.status === 'approved' || body.status === 'rejected' ? body.status : null;
  const entityType = body.entityType === 'game' || body.entityType === 'live' ? body.entityType : null;
  if (!status) return NextResponse.json({ error: 'status deve ser approved ou rejected' }, { status: 400 });

  const now = new Date();

  if (entityType === 'game') {
    const comment = await prisma.gameComment.findUnique({ where: { id }, select: { id: true } });
    if (!comment) return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 });
    await prisma.gameComment.update({
      where: { id },
      data: { status, reviewedAt: now, reviewedBy: session.userId },
    });
    return NextResponse.json({ ok: true, status });
  }

  if (entityType === 'live') {
    const comment = await prisma.liveComment.findUnique({ where: { id }, select: { id: true } });
    if (!comment) return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 });
    await prisma.liveComment.update({
      where: { id },
      data: { status, reviewedAt: now, reviewedBy: session.userId },
    });
    return NextResponse.json({ ok: true, status });
  }

  // Try both
  const [gameComment, liveComment] = await Promise.all([
    prisma.gameComment.findUnique({ where: { id }, select: { id: true } }),
    prisma.liveComment.findUnique({ where: { id }, select: { id: true } }),
  ]);
  if (gameComment) {
    await prisma.gameComment.update({
      where: { id },
      data: { status, reviewedAt: now, reviewedBy: session.userId },
    });
    return NextResponse.json({ ok: true, status });
  }
  if (liveComment) {
    await prisma.liveComment.update({
      where: { id },
      data: { status, reviewedAt: now, reviewedBy: session.userId },
    });
    return NextResponse.json({ ok: true, status });
  }
  return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 });
}

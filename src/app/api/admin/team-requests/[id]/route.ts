import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'] as const;
type TeamRequestStatus = (typeof VALID_STATUSES)[number];

/** PATCH: atualiza status da solicitação */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body.status as TeamRequestStatus;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido. Use: PENDING, IN_PROGRESS, RESOLVED ou IGNORED.' },
        { status: 400 }
      );
    }

    const existing = await prisma.teamRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
    }

    const updateData: { status: TeamRequestStatus; resolvedAt?: Date | null } = { status };
    if (status === 'RESOLVED' || status === 'IGNORED') {
      updateData.resolvedAt = new Date();
    } else {
      updateData.resolvedAt = null;
    }

    const updated = await prisma.teamRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('[PATCH /api/admin/team-requests/[id]]', e);
    return NextResponse.json({ error: 'Erro ao atualizar solicitação.' }, { status: 500 });
  }
}

/** DELETE: remove solicitação */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.teamRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
    }

    await prisma.teamRequest.delete({ where: { id } });

    return NextResponse.json({ ok: true, message: 'Solicitação excluída.' });
  } catch (e) {
    console.error('[DELETE /api/admin/team-requests/[id]]', e);
    return NextResponse.json({ error: 'Erro ao excluir solicitação.' }, { status: 500 });
  }
}

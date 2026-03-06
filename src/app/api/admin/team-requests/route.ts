import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** GET: lista solicitações de cadastro de time (admin). Aceita ?status=PENDING,IN_PROGRESS,RESOLVED,IGNORED */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const where = statusFilter
      ? { status: statusFilter as 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'IGNORED' }
      : undefined;

    const list = await prisma.teamRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json(list);
  } catch (e) {
    console.error('[GET /api/admin/team-requests]', e);
    return NextResponse.json({ error: 'Erro ao listar solicitações' }, { status: 500 });
  }
}

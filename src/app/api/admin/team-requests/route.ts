import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** GET: lista solicitações de cadastro de time (admin). */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const list = await prisma.teamRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
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

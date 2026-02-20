import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

/** DELETE /api/admin/partners/[id] – Remove o parceiro (admin). Comissões (earnings) são removidas em cascata. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id } = await params;

  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }

  await prisma.partner.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Marca comissão de plano/jogo como paga (admin). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; earningId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { id: teamId, earningId } = await params;

  const earning = await prisma.teamPlanEarning.findFirst({
    where: { id: earningId, teamId },
  });
  if (!earning) return NextResponse.json({ error: 'Comissão não encontrada' }, { status: 404 });
  if (earning.status === 'paid') return NextResponse.json({ error: 'Comissão já está paga' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const paymentReference = typeof body.paymentReference === 'string' ? body.paymentReference.trim() : null;

  await prisma.teamPlanEarning.update({
    where: { id: earningId },
    data: { status: 'paid', paidAt: new Date(), paymentReference: paymentReference || null },
  });

  return NextResponse.json({ ok: true });
}

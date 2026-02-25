import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Atualiza o recibo de um saque de time (admin). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const receiptUrl =
    body && typeof body.receiptUrl === 'string' && body.receiptUrl.trim()
      ? body.receiptUrl.trim()
      : null;

  if (!receiptUrl) {
    return NextResponse.json({ error: 'URL do recibo obrigatória.' }, { status: 400 });
  }

  const withdrawal = await prisma.teamWithdrawal.update({
    where: { id },
    data: { receiptUrl },
  });

  return NextResponse.json({ ok: true, receiptUrl: withdrawal.receiptUrl });
}


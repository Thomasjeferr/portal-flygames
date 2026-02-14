import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { recalculatePreSaleGameStatus } from '@/services/pre-sale-status.service';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  const game = await recalculatePreSaleGameStatus(id);
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  return NextResponse.json(game);
}

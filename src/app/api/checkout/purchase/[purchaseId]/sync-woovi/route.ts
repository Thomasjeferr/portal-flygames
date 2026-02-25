import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWooviChargeStatus } from '@/lib/payments/woovi';
import { markWooviPurchaseAsPaid } from '@/lib/payments/wooviPurchaseHandler';

/**
 * Fallback para sincronizar o status de uma compra Pix (Woovi)
 * consultando diretamente a API da Woovi/OpenPix.
 *
 * É chamado esporadicamente pelo front-end caso o webhook não
 * tenha marcado a compra como paga dentro de alguns segundos.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const purchaseId = (await params).purchaseId;

  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, userId: session.userId },
    select: {
      id: true,
      paymentStatus: true,
      paymentGateway: true,
      externalId: true,
    },
  });

  if (!purchase) {
    return NextResponse.json({ error: 'Compra não encontrada' }, { status: 404 });
  }

  // Já está paga – nada a fazer.
  if (purchase.paymentStatus === 'paid') {
    return NextResponse.json({ paid: true, synced: false });
  }

  // Só tentamos sincronizar compras feitas via Woovi com externalId definido.
  if (purchase.paymentGateway !== 'woovi' || !purchase.externalId) {
    return NextResponse.json({ paid: false, synced: false });
  }

  try {
    const charge = await getWooviChargeStatus(purchase.externalId);
    if (!charge) {
      return NextResponse.json({ paid: false, synced: false });
    }

    const status = (charge as { status?: string }).status ?? '';
    if (status === 'COMPLETED') {
      await markWooviPurchaseAsPaid(purchase.id);
      return NextResponse.json({ paid: true, synced: true });
    }

    return NextResponse.json({ paid: false, synced: true, status });
  } catch (e) {
    console.error('[checkout][sync-woovi] erro ao sincronizar:', e);
    return NextResponse.json(
      { error: 'Erro ao sincronizar com Woovi', paid: false, synced: false },
      { status: 500 }
    );
  }
}


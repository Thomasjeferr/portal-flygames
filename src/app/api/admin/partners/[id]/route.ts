import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/admin/partners/[id]
 * Retorna todas as informações do parceiro para o admin:
 * dados cadastrais, contagem de indicações, totais de comissão e lista de indicações/ganhos.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id } = await params;

  const partner = await prisma.partner.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  if (!partner) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }

  const earnings = await prisma.partnerEarning.findMany({
    where: { partnerId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      grossAmountCents: true,
      commissionPercent: true,
      amountCents: true,
      status: true,
      paidAt: true,
      paymentReference: true,
      createdAt: true,
    },
  });

  const purchaseIds = earnings.filter((e) => e.sourceType === 'purchase').map((e) => e.sourceId);
  const sponsorIds = earnings.filter((e) => e.sourceType === 'sponsor').map((e) => e.sourceId);

  const [purchases, sponsorOrders] = await Promise.all([
    purchaseIds.length > 0
      ? prisma.purchase.findMany({
          where: { id: { in: purchaseIds } },
          select: {
            id: true,
            user: { select: { name: true, email: true } },
            plan: { select: { name: true } },
            createdAt: true,
          },
        })
      : [],
    sponsorIds.length > 0
      ? prisma.sponsorOrder.findMany({
          where: { id: { in: sponsorIds } },
          select: {
            id: true,
            companyName: true,
            email: true,
            amountCents: true,
            createdAt: true,
          },
        })
      : [],
  ]);

  const purchaseMap = new Map(purchases.map((p) => [p.id, p]));
  const sponsorMap = new Map(sponsorOrders.map((s) => [s.id, s]));

  let totalPendenteCents = 0;
  let totalPagoCents = 0;
  const indicacoes = earnings.map((e) => {
    if (e.status === 'pending') totalPendenteCents += e.amountCents;
    else totalPagoCents += e.amountCents;

    const type = e.sourceType === 'purchase' ? 'plano' : 'patrocínio';
    let clientLabel = '—';
    let origemLabel = type;
    if (e.sourceType === 'purchase') {
      const p = purchaseMap.get(e.sourceId);
      clientLabel = p?.user?.name?.trim() || p?.user?.email || '—';
      if (p?.plan?.name) origemLabel = p.plan.name;
    } else {
      const s = sponsorMap.get(e.sourceId);
      clientLabel = s?.companyName?.trim() || s?.email || '—';
    }

    return {
      id: e.id,
      type,
      origemLabel,
      clientLabel,
      date: e.createdAt.toISOString(),
      grossAmountCents: e.grossAmountCents,
      commissionPercent: e.commissionPercent,
      commissionCents: e.amountCents,
      status: e.status,
      paidAt: e.paidAt?.toISOString() ?? null,
      paymentReference: e.paymentReference,
    };
  });

  return NextResponse.json({
    partner: {
      id: partner.id,
      name: partner.name,
      companyName: partner.companyName,
      type: partner.type,
      status: partner.status,
      refCode: partner.refCode,
      whatsapp: partner.whatsapp,
      city: partner.city,
      state: partner.state,
      document: partner.document,
      planCommissionPercent: partner.planCommissionPercent,
      gameCommissionPercent: partner.gameCommissionPercent,
      sponsorCommissionPercent: partner.sponsorCommissionPercent,
      pixKey: partner.pixKey,
      pixKeyType: partner.pixKeyType,
      createdAt: partner.createdAt.toISOString(),
      updatedAt: partner.updatedAt.toISOString(),
      userEmail: partner.user?.email ?? null,
      userName: partner.user?.name ?? null,
    },
    stats: {
      totalIndicacoes: earnings.length,
      totalComissaoPendenteCents: totalPendenteCents,
      totalComissaoPagoCents: totalPagoCents,
    },
    indicacoes,
  });
}

/** DELETE /api/admin/partners/[id] – Remove o parceiro (admin). */
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

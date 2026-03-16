import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getMonthRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;
  if (period === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else {
    // this_month (default)
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date();
  }
  return { start, end };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );
  const period = searchParams.get('period') ?? 'this_month';
  const typeFilter = searchParams.get('type') ?? 'all'; // all | plan | pre_sale

  const { start, end } = getMonthRange(period);

  const includePlan = typeFilter === 'all' || typeFilter === 'plan';
  const includePreSale = typeFilter === 'all' || typeFilter === 'pre_sale';

  const [purchases, preSaleSlots] = await Promise.all([
    includePlan
      ? prisma.purchase.findMany({
          where: {
            paymentStatus: 'paid',
            createdAt: { gte: start, lte: end },
          },
          include: {
            user: { select: { name: true, email: true } },
            plan: { select: { name: true, price: true, type: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [],
    includePreSale
      ? prisma.preSaleClubSlot.findMany({
          where: {
            paymentStatus: 'PAID',
            paidAt: { gte: start, lte: end },
          },
          include: {
            preSaleGame: { select: { title: true, clubAPrice: true, clubBPrice: true } },
          },
          orderBy: { paidAt: 'desc' },
        })
      : [],
  ]);

  type VendaRow = {
    id: string;
    type: 'plan' | 'pre_sale';
    date: string;
    whoName: string;
    whoEmail: string | null;
    valueCents: number;
    gateway: string | null;
    description: string;
  };

  const planRows: VendaRow[] = purchases.map((p) => {
    const valueCents = p.amountCents != null ? p.amountCents : Math.round((p.plan?.price ?? 0) * 100);
    const planLabel = p.plan?.type === 'unitario' ? 'Jogo avulso' : p.plan?.name ?? 'Plano';
    return {
      id: `p-${p.id}`,
      type: 'plan',
      date: p.createdAt.toISOString(),
      whoName: p.user?.name ?? '—',
      whoEmail: p.user?.email ?? null,
      valueCents,
      gateway: p.paymentGateway ?? null,
      description: planLabel,
    };
  });

  const preSaleRows: VendaRow[] = preSaleSlots.map((s) => {
    const price = s.slotIndex === 1 ? s.preSaleGame.clubAPrice : s.preSaleGame.clubBPrice;
    const valueCents = Math.round(price * 100);
    return {
      id: `s-${s.id}`,
      type: 'pre_sale',
      date: (s.paidAt ?? s.createdAt).toISOString(),
      whoName: s.responsibleName,
      whoEmail: s.responsibleEmail ?? null,
      valueCents,
      gateway: s.paymentProvider ?? null,
      description: `${s.preSaleGame?.title ?? 'Pré-estreia'} (clube)`,
    };
  });

  const merged = [...planRows, ...preSaleRows].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const total = merged.length;
  const skip = (page - 1) * limit;
  const items = merged.slice(skip, skip + limit);

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  });
}

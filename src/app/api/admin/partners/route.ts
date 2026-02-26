import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const [total, partners] = await Promise.all([
    prisma.partner.count(),
    prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        companyName: true,
        type: true,
        status: true,
        whatsapp: true,
        city: true,
        state: true,
        refCode: true,
        planCommissionPercent: true,
        gameCommissionPercent: true,
        sponsorCommissionPercent: true,
        createdAt: true,
        _count: { select: { earnings: true } },
      },
    }),
  ]);

  const items = partners.map((p) => ({
    id: p.id,
    name: p.name,
    companyName: p.companyName,
    type: p.type,
    status: p.status,
    whatsapp: p.whatsapp,
    city: p.city,
    state: p.state,
    refCode: p.refCode,
    planCommissionPercent: p.planCommissionPercent,
    gameCommissionPercent: p.gameCommissionPercent,
    sponsorCommissionPercent: p.sponsorCommissionPercent,
    createdAt: p.createdAt.toISOString(),
    totalIndicacoes: p._count.earnings,
  }));

  return NextResponse.json({
    partners: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}


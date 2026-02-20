import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const partners = await prisma.partner.findMany({
    orderBy: { createdAt: 'desc' },
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
  });

  return NextResponse.json(
    partners.map((p) => ({
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
    }))
  );
}


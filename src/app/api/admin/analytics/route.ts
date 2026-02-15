import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseDateRange(query: string): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  const days = Math.min(365, Math.max(1, parseInt(query, 10) || 7));
  from.setDate(from.getDate() - days);
  return { from, to };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') ?? '7';
    const { from, to } = parseDateRange(days);

    const [visits, byCountry, byCity, byPage, recent] = await Promise.all([
      prisma.visitLog.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.visitLog.groupBy({
        by: ['country'],
        where: { createdAt: { gte: from, lte: to }, country: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 15,
      }),
      prisma.visitLog.groupBy({
        by: ['city', 'country'],
        where: { createdAt: { gte: from, lte: to }, city: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      prisma.visitLog.groupBy({
        by: ['pagePath'],
        where: { createdAt: { gte: from, lte: to } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 15,
      }),
      prisma.visitLog.findMany({
        where: { createdAt: { gte: from, lte: to }, lat: { not: null }, lng: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: {
          id: true,
          country: true,
          countryCode: true,
          regionName: true,
          city: true,
          lat: true,
          lng: true,
          timezone: true,
          isp: true,
          userAgent: true,
          pagePath: true,
          referrer: true,
          createdAt: true,
        },
      }),
    ]);

    const markers = recent.filter((v) => v.lat != null && v.lng != null).map((v) => ({
      id: v.id,
      lat: v.lat!,
      lng: v.lng!,
      country: v.country,
      city: v.city,
      pagePath: v.pagePath,
      createdAt: v.createdAt,
    }));

    return NextResponse.json({
      totalVisits: visits,
      byCountry: byCountry.map((c) => ({ country: c.country ?? 'Desconhecido', count: c._count.id })),
      byCity: byCity.map((c) => ({ city: c.city ?? 'Desconhecido', country: c.country ?? '', count: c._count.id })),
      byPage: byPage.map((p) => ({ pagePath: p.pagePath, count: p._count.id })),
      markers,
      dateRange: { from: from.toISOString(), to: to.toISOString() },
    });
  } catch (e) {
    console.error('[Analytics]', e);
    return NextResponse.json({ error: 'Erro ao carregar analytics' }, { status: 500 });
  }
}

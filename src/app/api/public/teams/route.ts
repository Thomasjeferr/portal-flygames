import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Lista times ativos e aprovados para seleção (time de coração no checkout, time no patrocínio). Sem cache. */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase();
    const teams = await prisma.team.findMany({
      where: {
        isActive: true,
        approvalStatus: 'approved',
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { shortName: { contains: search, mode: 'insensitive' as const } },
                { city: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        city: true,
        state: true,
        crestUrl: true,
      },
    });
    const res = NextResponse.json(teams);
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res;
  } catch (e) {
    console.error('GET /api/public/teams', e);
    return NextResponse.json([], { status: 200 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Lista times ativos e aprovados para seleção (time de coração no checkout, time no patrocínio). Sem cache. */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      where: {
        isActive: true,
        approvalStatus: 'approved',
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
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res;
  } catch (e) {
    console.error('GET /api/public/teams', e);
    return NextResponse.json([], { status: 200 });
  }
}

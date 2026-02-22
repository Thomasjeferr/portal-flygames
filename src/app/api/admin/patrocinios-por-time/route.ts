import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Lista times com contagem de patrocínios (empresas + torcedores) e valor total repassado. */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const teams = await prisma.team.findMany({
    where: { approvalStatus: 'approved' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const [sponsorAgg, planAgg] = await Promise.all([
    prisma.teamSponsorshipEarning.groupBy({
      by: ['teamId'],
      _count: { id: true },
      _sum: { amountCents: true },
    }),
    prisma.teamPlanEarning.groupBy({
      by: ['teamId'],
      _count: { id: true },
      _sum: { amountCents: true },
    }),
  ]);

  const sponsorByTeam = new Map(sponsorAgg.map((s) => [s.teamId, { count: s._count.id, sum: s._sum.amountCents ?? 0 }]));
  const planByTeam = new Map(planAgg.map((p) => [p.teamId, { count: p._count.id, sum: p._sum.amountCents ?? 0 }]));

  let empresasTotal = 0;
  let torcedoresTotal = 0;
  let valorTotalCents = 0;

  const teamsWithStats = teams.map((t) => {
    const sp = sponsorByTeam.get(t.id) ?? { count: 0, sum: 0 };
    const pl = planByTeam.get(t.id) ?? { count: 0, sum: 0 };
    empresasTotal += sp.count;
    torcedoresTotal += pl.count;
    valorTotalCents += sp.sum + pl.sum;
    return {
      teamId: t.id,
      teamName: t.name,
      empresasCount: sp.count,
      torcedoresCount: pl.count,
      valorTotalCents: sp.sum + pl.sum,
    };
  });

  return NextResponse.json({
    summary: {
      empresasTotal,
      torcedoresTotal,
      valorTotalRepassadoCents: valorTotalCents,
    },
    teams: teamsWithStats,
  });
}

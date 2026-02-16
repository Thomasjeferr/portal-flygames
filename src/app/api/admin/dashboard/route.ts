import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const now = new Date();
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const sevenDaysAgo = daysAgo(7);
    const thirtyDaysAgo = daysAgo(30);
    const monthStart = startOfMonth();

    // KPIs - em paralelo
    const [
      usersToday,
      users7d,
      subscriptions,
      gamesCount,
      preSaleCounts,
      visitsToday,
      visits7d,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.subscription.findMany({
        where: { active: true, endDate: { gte: now } },
        include: { plan: true },
      }),
      prisma.game.count(),
      prisma.preSaleGame.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.visitLog.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.visitLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    // Receita do mês: Purchase (paid) + PreSaleClubSlot (PAID)
    const [purchasesPaid, preSaleSlotsPaid] = await Promise.all([
      prisma.purchase.findMany({
        where: {
          paymentStatus: 'paid',
          createdAt: { gte: monthStart },
        },
        include: { plan: true },
      }),
      prisma.preSaleClubSlot.findMany({
        where: { paymentStatus: 'PAID', paidAt: { gte: monthStart } },
        include: { preSaleGame: true },
      }),
    ]);

    const revenueFromPurchases = purchasesPaid.reduce((s, p) => s + (p.plan?.price ?? 0), 0);
    const revenueFromPreSale = preSaleSlotsPaid.reduce((s, slot) => {
      const price = slot.slotIndex === 1 ? slot.preSaleGame.clubAPrice : slot.preSaleGame.clubBPrice;
      return s + price;
    }, 0);
    const monthlyRevenue = revenueFromPurchases + revenueFromPreSale;

    // Assinantes ativos mensal/anual
    const subsByPlan = subscriptions.reduce(
      (acc, s) => {
        const p = s.plan?.periodicity ?? 'outro';
        acc[p] = (acc[p] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const activeSubsMonthly = subsByPlan.mensal ?? 0;
    const activeSubsAnnual = subsByPlan.anual ?? 0;

    // Compras unitárias do mês (Purchase com plan.type unitario)
    const oneTimePurchases = await prisma.purchase.count({
      where: {
        paymentStatus: 'paid',
        createdAt: { gte: monthStart },
        plan: { type: 'unitario' },
      },
    });

    // Pré-estreias por status
    const preSaleByStatus = preSaleCounts.reduce(
      (acc, c) => {
        acc[c.status] = c._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    const kpis = {
      usersToday,
      users7d,
      activeSubsMonthly,
      activeSubsAnnual,
      monthlyRevenue,
      oneTimePurchasesMonth: oneTimePurchases,
      visitsToday,
      visits7d,
      gamesPublished: gamesCount,
      preSalePreSale: preSaleByStatus.PRE_SALE ?? 0,
      preSaleFunded: preSaleByStatus.FUNDED ?? 0,
      preSalePublished: preSaleByStatus.PUBLISHED ?? 0,
    };

    // Séries para gráficos (últimos 30 dias)
    const dates30: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates30.push(d.toISOString().slice(0, 10));
    }

    // Receita por dia
    const purchasesByDay = await prisma.purchase.findMany({
      where: {
        paymentStatus: 'paid',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, planId: true, plan: { select: { price: true } } },
    });
    const preSaleByDay = await prisma.preSaleClubSlot.findMany({
      where: { paymentStatus: 'PAID', paidAt: { gte: thirtyDaysAgo } },
      select: { paidAt: true, slotIndex: true, preSaleGame: { select: { clubAPrice: true, clubBPrice: true } } },
    });

    const revenueByDate: Record<string, number> = {};
    dates30.forEach((d) => { revenueByDate[d] = 0; });
    purchasesByDay.forEach((p) => {
      const key = p.createdAt.toISOString().slice(0, 10);
      if (revenueByDate[key] !== undefined) revenueByDate[key] += p.plan?.price ?? 0;
    });
    preSaleByDay.forEach((s) => {
      const key = s.paidAt ? s.paidAt.toISOString().slice(0, 10) : '';
      if (revenueByDate[key] !== undefined) {
        revenueByDate[key] += s.slotIndex === 1 ? s.preSaleGame.clubAPrice : s.preSaleGame.clubBPrice;
      }
    });
    const revenueSeries = dates30.map((date) => ({ date, value: Math.round(revenueByDate[date] * 100) / 100 }));

    // Cadastros por dia
    const usersByDay = await prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });
    const signupsByDate: Record<string, number> = {};
    dates30.forEach((d) => { signupsByDate[d] = 0; });
    usersByDay.forEach((u) => {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (signupsByDate[key] !== undefined) signupsByDate[key]++;
    });
    const signupsSeries = dates30.map((date) => ({ date, value: signupsByDate[date] ?? 0 }));

    // Plays por dia (com fallback se PlayEvent não existir no client)
    let playEvents: { createdAt: Date }[] = [];
    let playsByGame: { gameId: string; _count: { id: number } }[] = [];
    try {
      playEvents = await prisma.playEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      });
      const grouped = await prisma.playEvent.groupBy({
        by: ['gameId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
      });
      playsByGame = grouped
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 10);
    } catch {
      // PlayEvent pode não existir se Prisma client não foi regenerado
    }
    const playsByDate: Record<string, number> = {};
    dates30.forEach((d) => { playsByDate[d] = 0; });
    playEvents.forEach((p) => {
      const key = p.createdAt.toISOString().slice(0, 10);
      if (playsByDate[key] !== undefined) playsByDate[key]++;
    });
    const playsSeries = dates30.map((date) => ({ date, value: playsByDate[date] ?? 0 }));
    const gameIds = playsByGame.map((p) => p.gameId);
    const gamesMap = gameIds.length
      ? new Map(
          (await prisma.game.findMany({ where: { id: { in: gameIds } } })).map((g) => [g.id, g])
        )
      : new Map<string, { id: string; title: string; championship: string; slug: string }>();

    const topGames = playsByGame.map((p) => {
      const g = gamesMap.get(p.gameId);
      const estRev = purchasesPaid
        .filter((pu) => pu.gameId === p.gameId)
        .reduce((s, pu) => s + (pu.plan?.price ?? 0), 0);
      return {
        id: p.gameId,
        title: g?.title ?? '—',
        championship: g?.championship ?? '—',
        slug: g?.slug ?? '',
        plays: p._count.id,
        estimatedRevenue: estRev,
      };
    });

    // Pré-estreias em andamento (PRE_SALE ou FUNDED)
    const preSales = await prisma.preSaleGame.findMany({
      where: { status: { in: ['PRE_SALE', 'FUNDED'] } },
      include: {
        clubSlots: { where: { paymentStatus: 'PAID' }, select: { slotIndex: true } },
        specialCategory: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const preSalesList = preSales.map((ps) => {
      const funded = ps.clubSlots.length;
      const totalRaised = ps.clubSlots.reduce((s, sl) => {
        const price = sl.slotIndex === 1 ? ps.clubAPrice : ps.clubBPrice;
        return s + price;
      }, 0);
      return {
        id: ps.id,
        title: ps.title,
        status: ps.status,
        fundedClubs: `${funded}/2`,
        totalRaised: Math.round(totalRaised * 100) / 100,
        slug: ps.slug,
      };
    });

    // Alertas operacionais
    let gamesNoVideo: { id: string; title: string; slug: string }[] = [];
    let bannersExpiring: { id: string; headline: string | null; endAt: Date | null }[] = [];
    let webhookFailures: { id: string; provider: string; eventId: string; createdAt: Date }[] = [];

    const [gamesNoVideoRes, bannersExpiringRes, webhookFailuresRes] = await Promise.all([
      prisma.game.findMany({
        where: { videoUrl: '' },
        select: { id: true, title: true, slug: true },
      }),
      prisma.homeBanner.findMany({
        where: {
          isActive: true,
          endAt: { not: null },
        },
        select: { id: true, headline: true, endAt: true },
      }).then((list) =>
        list.filter((b) => {
          const end = b.endAt;
          if (!end) return false;
          const in48h = end.getTime() <= Date.now() + 48 * 60 * 60 * 1000;
          const future = end.getTime() >= now.getTime();
          return in48h && future;
        })
      ),
      (async () => {
        try {
          return await prisma.webhookEvent.findMany({
            where: { status: 'FAILED', createdAt: { gte: daysAgo(1) } },
            select: { id: true, provider: true, eventId: true, createdAt: true },
            take: 10,
          });
        } catch {
          return [];
        }
      })(),
    ]);
    gamesNoVideo = gamesNoVideoRes;
    bannersExpiring = bannersExpiringRes;
    webhookFailures = webhookFailuresRes;

    const alerts = [
      ...gamesNoVideo.map((g) => ({
        type: 'game_no_video' as const,
        title: 'Jogo sem vídeo',
        message: g.title,
        href: `/admin/jogos/${g.id}/editar`,
      })),
      ...bannersExpiring.map((b) => ({
        type: 'banner_expiring' as const,
        title: 'Banner expirando em 48h',
        message: b.headline ?? 'Banner sem título',
        href: `/admin/banner/${b.id}/editar`,
      })),
      ...(webhookFailures.length > 0
        ? [
            {
              type: 'webhook_failure' as const,
              title: `Falhas de webhook (${webhookFailures.length})`,
              message: `${webhookFailures[0].provider}: ${webhookFailures[0].eventId}`,
              href: null as string | null,
            },
          ]
        : []),
    ];

    return NextResponse.json({
      kpis,
      series: {
        revenue: revenueSeries,
        signups: signupsSeries,
        plays: playsSeries,
      },
      topGames,
      preSales: preSalesList,
      alerts,
    });
  } catch (e) {
    console.error('[Dashboard]', e);
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 });
  }
}

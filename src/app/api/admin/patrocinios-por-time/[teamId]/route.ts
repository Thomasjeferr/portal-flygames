import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type SponsorRow = {
  id: string;
  tipo: 'empresa';
  patrocinador: string;
  planoProduto: string;
  valorRepassadoCents: number;
  status: string;
  orderCreatedAt: string;
};

type PlanRow = {
  id: string;
  tipo: 'torcedor_jogo_avulso' | 'torcedor_assinatura';
  patrocinador: string;
  planoProduto: string;
  valorRepassadoCents: number;
  status: string;
  orderCreatedAt: string;
};

/** Detalhe de patrocínios de um time (empresas + torcedores jogo avulso + assinatura). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { teamId } = await params;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true },
  });
  if (!team) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });

  const [sponsorEarnings, planEarnings] = await Promise.all([
    prisma.teamSponsorshipEarning.findMany({
      where: { teamId },
      include: {
        sponsorOrder: {
          include: {
            sponsorPlan: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.teamPlanEarning.findMany({
      where: { teamId },
      include: {
        purchase: {
          select: { createdAt: true },
          include: {
            user: { select: { name: true, email: true } },
            plan: { select: { name: true, type: true } },
            game: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const sponsorItems: SponsorRow[] = sponsorEarnings.map((e) => ({
    id: e.id,
    tipo: 'empresa',
    patrocinador: e.sponsorOrder?.companyName
      ? `${e.sponsorOrder.companyName}${e.sponsorOrder.email ? ` (${e.sponsorOrder.email})` : ''}`
      : 'Patrocinador',
    planoProduto: e.sponsorOrder?.sponsorPlan?.name ?? 'Patrocínio',
    valorRepassadoCents: e.amountCents,
    status: e.status,
    orderCreatedAt: e.sponsorOrder?.createdAt?.toISOString() ?? e.createdAt.toISOString(),
  }));

  const planItems: PlanRow[] = planEarnings.map((e) => {
    const plan = e.purchase?.plan;
    const isJogoAvulso = plan?.type === 'unitario';
    const produto =
      isJogoAvulso && e.purchase?.game?.title
        ? e.purchase.game.title
        : plan?.name ?? 'Plano';
    const userName = e.purchase?.user?.name?.trim() || e.purchase?.user?.email || 'Torcedor';
    const userEmail = e.purchase?.user?.email && e.purchase?.user?.name ? ` (${e.purchase.user.email})` : '';
    return {
      id: e.id,
      tipo: isJogoAvulso ? 'torcedor_jogo_avulso' : 'torcedor_assinatura',
      patrocinador: `${userName}${userEmail}`,
      planoProduto: produto,
      valorRepassadoCents: e.amountCents,
      status: e.status,
      orderCreatedAt: e.purchase?.createdAt?.toISOString() ?? e.createdAt.toISOString(),
    };
  });

  const items = [...sponsorItems, ...planItems].sort(
    (a, b) => new Date(b.orderCreatedAt).getTime() - new Date(a.orderCreatedAt).getTime()
  );

  const pendingCents = items.filter((i) => i.status === 'pending').reduce((s, i) => s + i.valorRepassadoCents, 0);

  return NextResponse.json({
    team: { id: team.id, name: team.name },
    summary: {
      empresasCount: sponsorItems.length,
      torcedoresCount: planItems.length,
      pendingCents,
    },
    items,
  });
}

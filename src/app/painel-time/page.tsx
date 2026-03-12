import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TeamDashboardCard, type TeamDashboardData } from '@/components/painel-time/TeamDashboardCard';

const PLAYER_ROLES = ['PLAYER', 'GOALKEEPER', 'ATLETA'];

async function getTeamDashboardData(
  teamId: string,
  team: {
    id: string;
    name: string;
    shortName: string | null;
    city: string | null;
    state: string | null;
    crestUrl: string | null;
    approvalStatus: string;
    isActive: boolean;
  }
): Promise<TeamDashboardData> {
  // Início de hoje (UTC) para considerar jogos do dia como "próximo confronto"
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [members, nextGame] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, role: true, number: true, photoUrl: true },
    }),
    prisma.game.findFirst({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        gameDate: { gte: startOfToday },
      },
      orderBy: { gameDate: 'asc' },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
    }),
  ]);

  const players = members.filter((m) => PLAYER_ROLES.includes(m.role));
  const comissao = members.filter((m) => !PLAYER_ROLES.includes(m.role));
  const captainMember = players.find((p) => p.number != null) ?? players[0];
  const captain = captainMember
    ? { name: captainMember.name, number: captainMember.number ?? 0 }
    : null;

  let nextGameFormatted: { opponentName: string; date: string } | null = null;
  if (nextGame) {
    const opponent =
      nextGame.homeTeamId === teamId ? nextGame.awayTeam : nextGame.homeTeam;
    nextGameFormatted = {
      opponentName: opponent?.name ?? 'Adversário',
      date: nextGame.gameDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
    };
  }

  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    city: team.city,
    state: team.state,
    crestUrl: team.crestUrl,
    approvalStatus: team.approvalStatus,
    isActive: team.isActive,
    activePlayersCount: members.length,
    comissaoCount: comissao.length,
    seasonWins: null,
    goalDifference: null,
    captain,
    nextGame: nextGameFormatted,
    carouselMembers: players.slice(0, 6).map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      photoUrl: p.photoUrl,
    })),
  };
}

export default async function PainelTimePage() {
  const session = await getSession();
  let teams: {
    id: string;
    name: string;
    shortName: string | null;
    city: string | null;
    state: string | null;
    crestUrl: string | null;
    isActive: boolean;
    approvalStatus: string;
  }[] = [];

  if (session) {
    let managers = await prisma.teamManager.findMany({
      where: { userId: session.userId },
      include: { team: true },
      orderBy: { createdAt: 'desc' },
    });
    if (managers.length === 0) {
      const sessionEmail = session.email?.trim().toLowerCase();
      if (sessionEmail) {
        const rows = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Team"
          WHERE approval_status = 'approved'
            AND responsible_email IS NOT NULL
            AND LOWER(TRIM(responsible_email)) = ${sessionEmail}
        `;
        const teamsByResponsible = rows.length > 0
          ? await prisma.team.findMany({ where: { id: { in: rows.map((r) => r.id) } } })
          : [];
        for (const team of teamsByResponsible) {
          await prisma.teamManager.upsert({
            where: {
              userId_teamId: { userId: session.userId, teamId: team.id },
            },
            update: {},
            create: {
              userId: session.userId,
              teamId: team.id,
              role: 'OWNER',
            },
          });
        }
        if (teamsByResponsible.length > 0) {
          managers = await prisma.teamManager.findMany({
            where: { userId: session.userId },
            include: { team: true },
            orderBy: { createdAt: 'desc' },
          });
        }
      }
    }
    teams = managers.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      shortName: m.team.shortName,
      city: m.team.city,
      state: m.team.state,
      crestUrl: m.team.crestUrl,
      isActive: m.team.isActive,
      approvalStatus: m.team.approvalStatus,
    }));
  }

  if (!session) {
    return (
      <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">Painel do time</h1>
          <p className="text-futvar-light mb-4">
            Entre com sua conta para acessar o painel do time (comissões e elenco).
          </p>
          <Link
            href="/entrar?redirect=/painel-time"
            className="inline-flex px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">Painel do time</h1>
          <p className="text-futvar-light mb-4">
            Nenhum time vinculado à sua conta ainda.
          </p>
          <p className="text-futvar-light text-sm mb-4">
            Use o mesmo e-mail com o qual você foi aprovado como responsável pelo time. Se você acabou de redefinir sua senha, faça login novamente com esse e-mail e a nova senha.
          </p>
          <Link
            href="/times/cadastrar"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
          >
            Cadastrar meu time
          </Link>
        </div>
      </div>
    );
  }

  const dashboardDataList = await Promise.all(
    teams.map((t) => getTeamDashboardData(t.id, t))
  );

  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Área do time</h1>
        {dashboardDataList.map((data) => (
          <TeamDashboardCard key={data.id} data={data} />
        ))}
      </div>
    </div>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { canAccessApprovedResults } from '@/lib/access';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Resultados aprovados',
  description: 'Súmulas oficiais dos jogos aprovadas pelos times. Área exclusiva para assinantes e patrocinadores.',
};

async function getApprovedSumulaGames() {
  const approved = await prisma.gameSumulaApproval.groupBy({
    by: ['gameId'],
    where: { status: 'APROVADA' },
    _count: { id: true },
  });
  const gameIdsBothApproved = approved.filter((g) => g._count.id === 2).map((g) => g.gameId);
  if (gameIdsBothApproved.length === 0) return [];

  const games = await prisma.game.findMany({
    where: {
      id: { in: gameIdsBothApproved },
      sumulaPublishedAt: { not: null },
    },
    orderBy: { gameDate: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      championship: true,
      gameDate: true,
      homeScore: true,
      awayScore: true,
      homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
    },
  });
  return games.map((g) => ({
    ...g,
    gameDate: g.gameDate.toISOString(),
  }));
}

export default async function ResultadosPage() {
  const session = await getSession();
  if (!session) {
    redirect(`/entrar?redirect=${encodeURIComponent('/resultados')}`);
  }

  const canAccess = await canAccessApprovedResults(session.userId);
  if (!canAccess) {
    return (
      <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
        <div className="max-w-xl mx-auto text-center">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex gap-2 mb-6">
            ← Voltar ao início
          </Link>
          <h1 className="text-2xl font-bold text-white mb-4">Resultados aprovados</h1>
          <p className="text-futvar-light mb-6">
            Esta área é exclusiva para <strong className="text-white">assinantes com acesso total</strong> ou <strong className="text-white">patrocinadores empresa</strong>.
          </p>
          <p className="text-futvar-light text-sm mb-8">
            Quem assina ou compra apenas um jogo não tem acesso a esta página.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/planos"
              className="px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
            >
              Ver planos de assinatura
            </Link>
            <Link
              href="/patrocinar"
              className="px-6 py-3 rounded-lg border-2 border-futvar-gold/50 text-futvar-gold font-bold hover:bg-futvar-gold/10 transition-colors"
            >
              Seja um patrocinador
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const games = await getApprovedSumulaGames();

  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex gap-2 mb-6">
          ← Voltar ao início
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Resultados aprovados</h1>
        <p className="text-futvar-light mb-8">
          Súmulas oficiais dos jogos, aprovadas pelos dois times. Clique em um jogo para ver placar e estatísticas.
        </p>

        {games.length === 0 ? (
          <div className="rounded-2xl border border-futvar-green/20 bg-futvar-dark/50 p-12 text-center">
            <p className="text-futvar-light">Nenhum resultado aprovado pelos times no momento.</p>
            <p className="text-futvar-light text-sm mt-2">Quando houver jogos com súmula aprovada por ambos os times, eles aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {games.map((g) => {
              const hasScore = g.homeScore != null && g.awayScore != null;
              return (
                <Link
                  key={g.id}
                  href={`/resultados/${g.slug}`}
                  className="block rounded-xl border border-white/10 bg-futvar-dark p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {g.homeTeam?.crestUrl ? (
                      <img src={g.homeTeam.crestUrl} alt="" className="h-10 w-10 rounded object-contain border border-white/20" />
                    ) : (
                      <span className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-futvar-light text-xs">
                        {g.homeTeam?.shortName?.slice(0, 2) ?? '—'}
                      </span>
                    )}
                    <span className="text-white font-medium">{g.homeTeam?.shortName ?? g.homeTeam?.name ?? 'Mandante'}</span>
                    {hasScore ? (
                      <span className="text-futvar-green font-bold">{g.homeScore} x {g.awayScore}</span>
                    ) : (
                      <span className="text-futvar-light text-sm">x</span>
                    )}
                    <span className="text-white font-medium">{g.awayTeam?.shortName ?? g.awayTeam?.name ?? 'Visitante'}</span>
                    {g.awayTeam?.crestUrl ? (
                      <img src={g.awayTeam.crestUrl} alt="" className="h-10 w-10 rounded object-contain border border-white/20" />
                    ) : (
                      <span className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-futvar-light text-xs">
                        {g.awayTeam?.shortName?.slice(0, 2) ?? '—'}
                      </span>
                    )}
                  </div>
                  <p className="text-futvar-light text-sm mt-2">
                    {g.championship} · {new Date(g.gameDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

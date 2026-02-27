import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ResultadosList } from '@/components/resultados/ResultadosList';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Resultados',
  description: 'Placares e súmulas oficiais dos jogos aprovadas pelos times. Cadastre-se grátis para ver.',
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
    return (
      <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker flex items-center justify-center">
        <div className="max-w-xl mx-auto text-center">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex gap-2 mb-8">
            ← Voltar ao início
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Resultados e súmulas dos jogos
          </h1>
          <p className="text-futvar-light text-lg mb-2">
            <strong className="text-white">Cadastre-se grátis</strong> e veja placares, estatísticas e súmulas oficiais aprovadas pelos times.
          </p>
          <p className="text-futvar-light text-sm mb-8">
            É rápido, sem custo. Depois você pode assinar para assistir aos vídeos dos jogos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/cadastro?redirect=${encodeURIComponent('/resultados')}`}
              className="px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
            >
              Criar conta grátis
            </Link>
            <Link
              href={`/entrar?redirect=${encodeURIComponent('/resultados')}`}
              className="px-6 py-3 rounded-lg border-2 border-futvar-green/60 text-futvar-green font-bold hover:bg-futvar-green/10 transition-colors"
            >
              Já tenho conta
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
          <ResultadosList games={games} />
        )}
      </div>
    </div>
  );
}

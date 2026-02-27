import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import {
  TorneiosListHero,
  TorneiosListMetrics,
  TorneiosListCard,
  TorneiosListEmpty,
} from '@/components/torneios-list';

export const metadata = {
  title: 'Campeonatos Oficiais | FlyGames',
  description: 'Acompanhe, apoie e participe dos campeonatos oficiais da sua região.',
};

export const dynamic = 'force-dynamic';

async function getPublishedTournaments() {
  return prisma.tournament.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      season: true,
      maxTeams: true,
      registrationMode: true,
      _count: { select: { teams: true } },
    },
  });
}

export default async function TorneiosListPage() {
  const [tournaments, session] = await Promise.all([
    getPublishedTournaments(),
    getSession(),
  ]);
  const isAdmin = session?.role === 'admin';

  const totalTeams = tournaments.reduce((acc, t) => acc + t._count.teams, 0);
  const totalSlots = tournaments.reduce((acc, t) => acc + t.maxTeams, 0);

  return (
    <div className="min-h-screen bg-futvar-darker scroll-smooth">
      <TorneiosListHero isAdmin={isAdmin} />

      <TorneiosListMetrics
        totalTournaments={tournaments.length}
        totalTeams={totalTeams}
        totalSlots={totalSlots}
      />

      {tournaments.length === 0 ? (
        <TorneiosListEmpty isAdmin={isAdmin} />
      ) : (
        <section id="campeonatos" className="px-4 lg:px-12 py-12 scroll-mt-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8">Campeonatos em destaque</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {tournaments.map((t) => (
                <TorneiosListCard key={t.id} t={t} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

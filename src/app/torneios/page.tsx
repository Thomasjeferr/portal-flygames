import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata = {
  title: 'Copa Mata-Mata | Torneios',
  description: 'Conheça as copas em andamento, ranking de ativação e times confirmados.',
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
  const tournaments = await getPublishedTournaments();

  return (
    <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex gap-2">
            ← Voltar ao início
          </Link>
        </div>

        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Copa Mata-Mata</h1>
        <p className="text-futvar-light mb-10">
          Torneios publicados. Apoie seu time na meta ou acompanhe os confirmados.
        </p>

        {tournaments.length === 0 ? (
          <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-12 text-center">
            <p className="text-futvar-light">Nenhum torneio publicado no momento.</p>
            <Link href="/" className="inline-block mt-4 text-futvar-green hover:underline">
              Voltar ao início
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/torneios/${t.slug}`}
                className="block bg-futvar-dark border border-futvar-green/20 rounded-xl p-6 hover:border-futvar-green/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all"
              >
                <h2 className="text-lg font-bold text-white mb-1">{t.name}</h2>
                {t.season && <p className="text-futvar-light text-sm">{t.season}</p>}
                <p className="text-futvar-light text-sm mt-2">
                  {t._count.teams} / {t.maxTeams} times
                  {t.registrationMode === 'GOAL' && ' • Modo meta'}
                  {t.registrationMode === 'PAID' && ' • Inscrição paga'}
                </p>
                <span className="inline-block mt-3 text-futvar-green font-semibold text-sm">
                  Ver torneio →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

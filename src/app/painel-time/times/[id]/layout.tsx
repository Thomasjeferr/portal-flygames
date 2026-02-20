import Link from 'next/link';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

export default async function PainelTimeTeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: teamId } = await params;
  const hasAccess = await getTeamAccess(teamId);
  if (!hasAccess) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-red-400">Acesso negado a este time.</p>
        <Link href="/painel-time" className="text-futvar-light hover:text-white mt-4 inline-block">
          ← Voltar ao painel
        </Link>
      </div>
    );
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, shortName: true, crestUrl: true },
  });
  if (!team) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-red-400">Time não encontrado.</p>
        <Link href="/painel-time" className="text-futvar-light hover:text-white mt-4 inline-block">
          ← Voltar ao painel
        </Link>
      </div>
    );
  }

  const base = `/painel-time/times/${teamId}`;
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        {team.crestUrl ? (
          <img
            src={team.crestUrl.startsWith('http') ? team.crestUrl : team.crestUrl}
            alt=""
            className="h-16 w-16 object-contain rounded"
          />
        ) : null}
        <div>
          <h1 className="text-xl font-bold text-white">
            {team.name}
            {team.shortName ? (
              <span className="text-futvar-light font-normal text-base ml-2">({team.shortName})</span>
            ) : null}
          </h1>
          <nav className="flex flex-wrap gap-2 mt-2">
            <Link
              href={`${base}/comissoes`}
              className="text-sm text-futvar-light hover:text-white"
            >
              Comissões
            </Link>
            <span className="text-white/30">·</span>
            <Link
              href={`${base}/elenco`}
              className="text-sm text-futvar-light hover:text-white"
            >
              Elenco
            </Link>
            <span className="text-white/30">·</span>
            <Link
              href={`${base}/dados`}
              className="text-sm text-futvar-light hover:text-white"
            >
              Dados do time
            </Link>
          </nav>
        </div>
      </div>
      <div className="mb-4">
        <Link href="/painel-time" className="text-futvar-light hover:text-white text-sm">
          ← Voltar ao painel
        </Link>
      </div>
      {children}
    </div>
  );
}

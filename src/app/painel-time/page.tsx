import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const TEAM_PANEL_COOKIE = 'team_panel_token';

export default async function PainelTimePage() {
  const session = await getSession();
  let teams: { id: string; name: string; shortName: string | null; city: string | null; state: string | null; crestUrl: string | null; isActive: boolean; approvalStatus: string; role?: string }[] = [];

  if (session) {
    const managers = await prisma.teamManager.findMany({
      where: { userId: session.userId },
      include: { team: true },
      orderBy: { createdAt: 'desc' },
    });
    teams = managers.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      shortName: m.team.shortName,
      city: m.team.city,
      state: m.team.state,
      crestUrl: m.team.crestUrl,
      isActive: m.team.isActive,
      approvalStatus: m.team.approvalStatus,
      role: m.role,
    }));
  } else {
    const cookieStore = await cookies();
    const token = cookieStore.get(TEAM_PANEL_COOKIE)?.value;
    if (token) {
      const team = await prisma.team.findFirst({
        where: {
          panelAccessToken: token,
          panelTokenExpiresAt: { gt: new Date() },
          approvalStatus: 'approved',
        },
      });
      if (team) {
        teams = [{
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          city: team.city,
          state: team.state,
          crestUrl: team.crestUrl,
          isActive: team.isActive,
          approvalStatus: team.approvalStatus,
        }];
      }
    }
  }

  if (teams.length === 0 && !session) {
    return (
      <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">Painel do time</h1>
          <p className="text-futvar-light mb-4">
            Use o link de acesso que você recebeu por e-mail quando seu time foi aprovado. Esse link é exclusivo e não usa login do site.
          </p>
          <p className="text-futvar-light text-sm">
            Se você já tem conta no site, pode <Link href="/entrar" className="text-futvar-green hover:underline">entrar</Link> e acessar o painel pelos times vinculados à sua conta.
          </p>
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

  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">Painel do time</h1>
        <div className="space-y-4">
          {teams.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-white/10 bg-futvar-dark px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <p className="text-white font-semibold">
                  {t.name}
                  {t.shortName && (
                    <span className="text-futvar-light text-sm ml-2">({t.shortName})</span>
                  )}
                </p>
                <p className="text-futvar-light text-xs sm:text-sm">
                  {t.city || 'Cidade não informada'}
                  {t.state && ` / ${t.state}`}
                </p>
                <p className="text-xs mt-1">
                  <span
                    className={
                      t.approvalStatus === 'approved'
                        ? 'text-futvar-green'
                        : t.approvalStatus === 'pending'
                        ? 'text-amber-300'
                        : 'text-red-400'
                    }
                  >
                    {t.approvalStatus === 'approved'
                      ? 'Aprovado'
                      : t.approvalStatus === 'pending'
                      ? 'Pendente de aprovação'
                      : 'Rejeitado'}
                  </span>
                  {!t.isActive && t.approvalStatus === 'approved' && (
                    <span className="text-futvar-light/70"> · Inativo</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/painel-time/times/${t.id}/comissoes`}
                  className="px-4 py-2 rounded-lg bg-futvar-green text-futvar-darker text-sm font-semibold hover:bg-futvar-green-light"
                >
                  Ver comissões
                </Link>
                <Link
                  href={`/painel-time/times/${t.id}/elenco`}
                  className="px-4 py-2 rounded-lg bg-white/5 text-white text-sm font-semibold hover:bg-white/10"
                >
                  Gerenciar elenco
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


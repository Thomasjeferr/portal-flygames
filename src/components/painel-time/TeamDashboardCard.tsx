'use client';

import Link from 'next/link';
import {
  FiUsers,
  FiAward,
  FiTarget,
  FiCheck,
  FiUserCheck,
  FiChevronRight,
} from 'react-icons/fi';
import { TeamCrestLogo } from '@/components/painel-time/TeamCrestLogo';

const PLAYER_ROLES = ['PLAYER', 'GOALKEEPER', 'ATLETA'];

export type TeamDashboardData = {
  id: string;
  name: string;
  shortName: string | null;
  city: string | null;
  state: string | null;
  crestUrl: string | null;
  approvalStatus: string;
  isActive: boolean;
  activePlayersCount: number;
  comissaoCount: number;
  seasonWins: number | null;
  goalDifference: number | null;
  captain: { name: string; number: number } | null;
  nextGame: { opponentName: string; date: string } | null;
  carouselMembers: { id: string; name: string; number: number | null; photoUrl: string | null }[];
};

function fullUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (typeof window !== 'undefined') {
    const base = window.location.origin;
    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

export function TeamDashboardCard({ data }: { data: TeamDashboardData }) {
  const winsLabel = data.seasonWins != null ? data.seasonWins : '—';
  const goalsLabel =
    data.goalDifference != null
      ? (data.goalDifference >= 0 ? '+' : '') + data.goalDifference
      : '—';

  return (
    <div className="flex flex-col lg:flex-row rounded-2xl overflow-hidden border border-white/10 bg-futvar-darker shadow-card">
      {/* Esquerda: branding do time */}
      <div className="relative lg:w-[min(36%,320px)] flex flex-col items-center justify-center py-10 px-6 bg-gradient-to-b from-futvar-field/40 to-futvar-darker field-pattern">
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-8 left-8 w-16 h-16 border border-futvar-green/20 rounded-full" />
          <div className="absolute bottom-12 right-10 w-8 h-8 border border-futvar-green/15 rotate-45" />
          <div className="absolute top-1/2 right-6 w-1 h-24 bg-gradient-to-b transparent from-futvar-green/10 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <TeamCrestLogo
            name={data.name}
            shortName={data.shortName}
            crestUrl={data.crestUrl}
            className="h-24 w-24 min-h-[6rem] min-w-[6rem] rounded-xl"
          />
          <h2 className="mt-4 text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
            {data.name}
          </h2>
          <p className="mt-1 text-sm text-futvar-light">
            {[data.city, data.state].filter(Boolean).join(' / ') || '—'}
          </p>
        </div>
      </div>

      {/* Direita: painel do time */}
      <div className="flex-1 flex flex-col min-w-0 bg-futvar-dark/80 field-pattern border-t lg:border-t-0 lg:border-l border-white/10">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 px-4 sm:px-6 py-3 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-2 text-futvar-light text-sm">
            <FiUsers className="h-4 w-4 text-futvar-green" aria-hidden />
            <span>JOGADORES ATIVOS {data.activePlayersCount}</span>
          </div>
          <div className="flex items-center gap-2 text-futvar-light text-sm">
            <FiAward className="h-4 w-4 text-futvar-green" aria-hidden />
            <span>VITÓRIAS TEMPORADA {winsLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-futvar-light text-sm">
            <FiTarget className="h-4 w-4 text-futvar-green" aria-hidden />
            <span>SALDO GOLS {goalsLabel}</span>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 flex flex-col">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-white">PAINEL DO TIME</h3>
            {data.approvalStatus === 'approved' && data.isActive && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-futvar-green text-futvar-darker text-sm font-semibold">
                <FiCheck className="h-4 w-4" aria-hidden />
                APROVADO
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-futvar-green/90 mb-1">
                Resumo do elenco
              </p>
              <p className="text-white font-medium">
                {data.activePlayersCount} Jogadores
              </p>
              <p className="text-futvar-light text-sm">{data.comissaoCount} Comissão</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-futvar-green/90 mb-1">
                Capitão
              </p>
              {data.captain ? (
                <p className="text-white font-medium">
                  {data.captain.name}
                  {data.captain.number != null && (
                    <span className="text-futvar-light ml-1">#{data.captain.number}</span>
                  )}
                </p>
              ) : (
                <p className="text-futvar-light">—</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-futvar-green/90 mb-1">
                Próximos confrontos
              </p>
              {data.nextGame ? (
                <>
                  <p className="text-white font-medium">
                    vs. {data.nextGame.opponentName}
                  </p>
                  <p className="text-futvar-light text-sm">{data.nextGame.date}</p>
                </>
              ) : (
                <p className="text-futvar-light">—</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Link
              href={`/painel-time/times/${data.id}/elenco`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light transition-colors"
            >
              <FiUsers className="h-5 w-5" aria-hidden />
              Gerenciar elenco
            </Link>
            <Link
              href={`/painel-time/times/${data.id}/comissoes`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15 transition-colors border border-white/20"
            >
              <FiUserCheck className="h-5 w-5" aria-hidden />
              Ver comissões técnicas
            </Link>
          </div>

          <div className="mt-auto">
            <p className="text-xs text-futvar-light/80 mb-2 uppercase tracking-wider">
              Elenco
            </p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 scroll-smooth snap-x snap-mandatory">
              {data.carouselMembers.length === 0 ? (
                <p className="text-futvar-light text-sm py-2">Nenhum jogador no elenco.</p>
              ) : (
                data.carouselMembers.map((m) => {
                  const src = fullUrl(m.photoUrl);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 shrink-0 snap-start rounded-lg bg-white/5 px-3 py-2 border border-white/10"
                    >
                      {src ? (
                        <img
                          src={src}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover bg-white/10"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                          {(m.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-white text-sm font-medium whitespace-nowrap">
                        {m.name.split(' ').pop()?.toUpperCase() ?? '—'} {m.number ?? ''}
                      </span>
                    </div>
                  );
                })
              )}
              {data.carouselMembers.length > 0 && (
                <span className="shrink-0 flex items-center text-futvar-light/60 px-2" aria-hidden>
                  <FiChevronRight className="h-5 w-5" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

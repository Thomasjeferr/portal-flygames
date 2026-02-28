/** Tipos compartilhados para os componentes da página pública da Copa. */

export type TournamentTeamBasic = {
  teamId: string;
  goalCurrentSupporters: number;
  goalAchievedAt: Date | null;
  team: {
    id: string;
    name: string;
    shortName: string | null;
    crestUrl: string | null;
  };
};

export type TournamentMatchBasic = {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  penaltiesA?: number | null;
  penaltiesB?: number | null;
  status: string;
  scheduledAt: Date | null;
  teamA?: { id: string; name: string; shortName: string | null; crestUrl?: string | null } | null;
  teamB?: { id: string; name: string; shortName: string | null; crestUrl?: string | null } | null;
  winnerTeam?: { id: string; name: string; shortName: string | null } | null;
};

export type CopaHeroProps = {
  name: string;
  season: string | null;
  maxTeams: number;
  confirmedCount: number;
  goalRequired: number;
  goalPrice: number;
  isGoalMode: boolean;
  slug: string;
  /** Se true, usuário já é assinante; mostrar aviso no lugar do botão "Apoiar um time". */
  isAlreadySubscriber?: boolean;
};

export type CopaStatusCardsProps = {
  confirmedCount: number;
  maxTeams: number;
  goalEndAt: Date | null;
  goalStartAt: Date | null;
  leaderTeam: { name: string; supporters: number } | null;
  isGoalMode: boolean;
};

export type CopaRankingLeaderboardProps = {
  teams: TournamentTeamBasic[];
  goalRequired: number;
  goalPrice: number;
  slug: string;
  /** Se true, usuário já é assinante; mostrar aviso no lugar dos botões de apoio. */
  isAlreadySubscriber?: boolean;
};

export type CopaConfirmedTeamsProps = {
  teams: TournamentTeamBasic[];
};

export type CopaBracketProps = {
  matches: TournamentMatchBasic[];
  roundLabel: Record<number, string>;
};

export type CopaPremiacaoProps = {
  premiacaoTipo: string | null;
  premio1: number | null;
  premio2: number | null;
  premio3: number | null;
  premio4: number | null;
  trofeus: string[];
};

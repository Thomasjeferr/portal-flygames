import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { VideoPlayer } from '@/components/VideoPlayer';
import { GamePlayTracker } from '@/components/GamePlayTracker';
import { BuyGameButton } from '@/components/BuyGameButton';
import { GameCard } from '@/components/GameCard';
import { PlayerMatchInfo } from '@/components/PlayerMatchInfo';
import { MatchPlayerPage } from '@/components/match/MatchPlayerPage';
import { getSession } from '@/lib/auth';
import { canAccessGameBySlug } from '@/lib/access';
import { prisma } from '@/lib/db';
import { isStreamVideo, extractStreamVideoId, getSignedPlaybackUrls } from '@/lib/cloudflare-stream';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getSuggestedGames(currentGameId: string, championship: string) {
  const sameChamp = await prisma.game.findMany({
    where: { id: { not: currentGameId }, championship },
    orderBy: { gameDate: 'desc' },
    take: 6,
  });
  if (sameChamp.length >= 6) return sameChamp;
  const excludeIds = [currentGameId, ...sameChamp.map((g) => g.id)];
  const others = await prisma.game.findMany({
    where: { id: { notIn: excludeIds } },
    orderBy: [{ featured: 'desc' }, { gameDate: 'desc' }],
    take: 6 - sameChamp.length,
  });
  return [...sameChamp, ...others];
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
    },
  });
  const displayMode = game?.displayMode ?? 'internal';
  const showPlayer = displayMode === 'public_with_media' && !!game?.videoUrl;
  if (!game) notFound();

  const session = await getSession();
  const [suggested, teamManagerCount] = await Promise.all([
    getSuggestedGames(game.id, game.championship),
    session ? prisma.teamManager.count({ where: { userId: session.userId } }) : 0,
  ]);
  const canWatch = session ? await canAccessGameBySlug(session.userId, slug) : false;
  const isTeamManager = teamManagerCount > 0;
  let streamPlaybackUrl: string | undefined;
  let streamHlsUrl: string | undefined;
  if (canWatch && game.videoUrl && isStreamVideo(game.videoUrl)) {
    try {
      const vid = extractStreamVideoId(game.videoUrl);
      if (vid) {
        const urls = await getSignedPlaybackUrls(vid, 3600);
        streamPlaybackUrl = urls.iframeUrl;
        streamHlsUrl = urls.hlsUrl;
      }
    } catch {
      streamPlaybackUrl = undefined;
      streamHlsUrl = undefined;
    }
  }

  const gameDateFormatted = new Date(game.gameDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-gradient-to-b from-[#07130f] via-[#06221a] to-[#081a1a]">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2 transition-colors">
            ← Voltar ao início
          </Link>
        </div>

        {!canWatch ? (
          <MatchPlayerPage
            teamA={
              game.homeTeam
                ? {
                    name: game.homeTeam.shortName || game.homeTeam.name,
                    crest: game.homeTeam.crestUrl || undefined,
                    score: game.homeScore ?? undefined,
                  }
                : undefined
            }
            teamB={
              game.awayTeam
                ? {
                    name: game.awayTeam.shortName || game.awayTeam.name,
                    crest: game.awayTeam.crestUrl || undefined,
                    score: game.awayScore ?? undefined,
                  }
                : undefined
            }
            title={game.title}
            dateLabel={`${game.championship} • ${gameDateFormatted}`}
            isLive={false}
            isReplay={true}
            description={game.description}
          >
            <div className="relative w-full overflow-hidden rounded-2xl border border-emerald-400/25 bg-black shadow-[0_18px_60px_rgba(0,0,0,0.9)] shadow-emerald-500/10 aspect-video">
              {game.thumbnailUrl ? (
                <Image
                  src={game.thumbnailUrl.startsWith('http') ? game.thumbnailUrl : game.thumbnailUrl}
                  alt={game.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f1a] to-[#07130f]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8">
                <p className="text-center text-lg font-semibold text-white sm:text-xl md:text-2xl">
                  Assista ao jogo completo
                </p>
                <p className="mt-2 text-center text-sm text-emerald-100/90">
                  Patrocine o time ou compre o acesso para assistir
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {session && isTeamManager ? (
                    <p className="text-center text-sm text-emerald-50/90 max-w-md">
                      Esta conta é de responsável pelo time e não pode comprar acesso.
                      Para assinar ou comprar jogos, use uma conta de cliente.{' '}
                      <Link href="/cadastro" className="text-emerald-400 hover:underline font-semibold">
                        Cadastro
                      </Link>
                    </p>
                  ) : (
                    <>
                      {session ? (
                        <Link
                          href="/planos"
                          className="inline-flex items-center justify-center rounded-full bg-[#19d37a] px-6 py-3 text-sm font-bold text-[#02130b] shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-colors"
                        >
                          Ver planos e patrocinar
                        </Link>
                      ) : (
                        <Link
                          href="/entrar?redirect=/planos"
                          className="inline-flex items-center justify-center rounded-full bg-[#19d37a] px-6 py-3 text-sm font-bold text-[#02130b] shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-colors"
                        >
                          Entrar ou cadastrar para patrocinar
                        </Link>
                      )}
                      <BuyGameButton
                        gameId={game.id}
                        className="inline-flex items-center justify-center rounded-full border-2 border-amber-400/80 px-6 py-3 text-sm font-bold text-amber-300 hover:bg-amber-400/10 transition-colors"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </MatchPlayerPage>
        ) : showPlayer ? (
          <>
            <GamePlayTracker gameId={game.id} />

            <MatchPlayerPage
              teamA={
                game.homeTeam
                  ? {
                      name: game.homeTeam.shortName || game.homeTeam.name,
                      crest: game.homeTeam.crestUrl || undefined,
                      score: game.homeScore ?? undefined,
                    }
                  : undefined
              }
              teamB={
                game.awayTeam
                  ? {
                      name: game.awayTeam.shortName || game.awayTeam.name,
                      crest: game.awayTeam.crestUrl || undefined,
                      score: game.awayScore ?? undefined,
                    }
                  : undefined
              }
              title={game.title}
              dateLabel={`${game.championship} • ${gameDateFormatted}`}
              isLive={false}
              isReplay={true}
              description={game.description}
            >
              {game.videoUrl ? (
                <VideoPlayer
                  videoUrl={game.videoUrl}
                  title={game.title}
                  posterUrl={game.thumbnailUrl ?? undefined}
                  streamPlaybackUrl={streamPlaybackUrl}
                  streamHlsUrl={streamHlsUrl}
                  gameId={game.id}
                />
              ) : (
                <div className="relative mx-auto mt-4 max-w-[1100px] overflow-hidden rounded-2xl border border-emerald-400/25 bg-black shadow-[0_18px_60px_rgba(0,0,0,0.9)] shadow-emerald-500/10 aspect-video flex items-center justify-center">
                  {game.thumbnailUrl ? (
                    <Image src={game.thumbnailUrl} alt={game.title} fill className="object-cover opacity-60" />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <p className="text-emerald-50/90">Vídeo em breve</p>
                  </div>
                </div>
              )}
            </MatchPlayerPage>
          </>
        ) : (
          <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-8 md:p-12 text-center">
            <div className="mb-6">
              <PlayerMatchInfo
                title={game.title}
                homeTeam={game.homeTeam ?? undefined}
                awayTeam={game.awayTeam ?? undefined}
                subtitle={`${game.championship} • ${gameDateFormatted}`}
              />
            </div>
            {game.thumbnailUrl && (
              <div className="relative aspect-video max-w-2xl mx-auto rounded-lg overflow-hidden mb-8">
                <Image
                  src={game.thumbnailUrl.startsWith('http') ? game.thumbnailUrl : game.thumbnailUrl}
                  alt={game.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            {game.description && (
              <p className="text-futvar-light text-left max-w-2xl mx-auto">{game.description}</p>
            )}
          </div>
        )}

        {suggested.length > 0 && (
          <section className="mt-12 pt-10 border-t border-white/10">
            <h2 className="text-xl font-bold text-white mb-6">Você também pode gostar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggested.map((g) => (
                <GameCard
                  key={g.id}
                  slug={g.slug}
                  title={g.title}
                  championship={g.championship}
                  thumbnailUrl={g.thumbnailUrl}
                  gameDate={g.gameDate.toISOString()}
                  featured={g.featured}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

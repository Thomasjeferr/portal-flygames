import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { VideoPlayer } from '@/components/VideoPlayer';
import { GamePlayTracker } from '@/components/GamePlayTracker';
import { BuyGameButton } from '@/components/BuyGameButton';
import { GameCard } from '@/components/GameCard';
import { PlayerMatchInfo } from '@/components/PlayerMatchInfo';
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
    <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2 transition-colors">
            ← Voltar ao início
          </Link>
        </div>

        {!canWatch ? (
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
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                    <p className="text-lg text-white mb-4">Assinatura ou compra necessária para assistir</p>
                    {session && isTeamManager ? (
                      <p className="text-futvar-light max-w-md mx-auto">
                        Esta conta é de responsável pelo time e não pode comprar acesso. Para assinar ou comprar jogos, saia e crie uma conta de cliente em <Link href="/cadastro" className="text-futvar-green hover:underline">Cadastro</Link>.
                      </p>
                    ) : (
                      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4">
                        {session ? (
                          <Link
                            href="/planos"
                            className="inline-block px-8 py-4 bg-futvar-green text-futvar-darker font-bold rounded-lg hover:bg-futvar-green-light transition-colors shadow-lg shadow-futvar-green/25"
                          >
                            Ver planos e assinar
                          </Link>
                        ) : (
                          <Link
                            href="/entrar?redirect=/planos"
                            className="inline-block px-8 py-4 bg-futvar-green text-futvar-darker font-bold rounded-lg hover:bg-futvar-green-light transition-colors shadow-lg shadow-futvar-green/25"
                          >
                            Entrar ou cadastrar para assinar
                          </Link>
                        )}
                        <BuyGameButton gameId={game.id} className="inline-block px-6 py-4 border-2 border-futvar-gold/50 text-futvar-gold font-bold rounded-lg hover:bg-futvar-gold/10 transition-colors" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {game.description && (
              <p className="text-futvar-light text-left max-w-2xl mx-auto">{game.description}</p>
            )}
          </div>
        ) : (
          <>
            <GamePlayTracker gameId={game.id} />
            <div className="rounded-2xl overflow-hidden bg-black mb-8 border border-futvar-green/20 shadow-xl">
              {game.videoUrl ? (
                <VideoPlayer
                  videoUrl={game.videoUrl}
                  title={game.title}
                  streamPlaybackUrl={streamPlaybackUrl}
                  streamHlsUrl={streamHlsUrl}
                />
              ) : (
                <div className="relative aspect-video bg-black flex items-center justify-center">
                  {game.thumbnailUrl ? (
                    <Image src={game.thumbnailUrl} alt={game.title} fill className="object-cover opacity-50" />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <p className="text-futvar-light">Vídeo em breve</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mb-6">
              <PlayerMatchInfo
                title={game.title}
                homeTeam={game.homeTeam ?? undefined}
                awayTeam={game.awayTeam ?? undefined}
                subtitle={
                  <>
                    <span>{game.championship}</span>
                    <span>•</span>
                    <span>{gameDateFormatted}</span>
                  </>
                }
              />
            </div>
            {game.description && (
              <p className="text-futvar-light leading-relaxed max-w-3xl mb-6">{game.description}</p>
            )}
          </>
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

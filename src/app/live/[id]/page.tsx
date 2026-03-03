import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSession } from '@/lib/auth';
import { canAccessLive } from '@/lib/access';
import { prisma } from '@/lib/db';
import { getLiveHlsUrl, getReplayHlsUrl } from '@/lib/cloudflare-live';
import { StreamCustomPlayer } from '@/components/StreamCustomPlayer';
import { LiveScheduledToLivePlayer } from '@/components/LiveScheduledToLivePlayer';
import { MatchPlayerPage } from '@/components/match/MatchPlayerPage';

interface Props {
  params: Promise<{ id: string }>;
}

const liveInclude = {
  homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
  awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
} as const;

export default async function LivePage({ params }: Props) {
  const { id } = await params;
  let live = await prisma.live.findUnique({ where: { id }, include: liveInclude });
  if (!live) notFound();

  // Ajustar status pelo horário: SCHEDULED → LIVE quando startAt passou; LIVE → ENDED quando endAt passou.
  const now = new Date();
  const startAtDate = live.startAt ? new Date(live.startAt) : null;
  const endAtDate = live.endAt ? new Date(live.endAt) : null;
  if (
    live.status === 'SCHEDULED' &&
    startAtDate &&
    startAtDate <= now &&
    (!endAtDate || endAtDate > now)
  ) {
    await prisma.live.update({
      where: { id: live.id },
      data: { status: 'LIVE' },
    });
    live = await prisma.live.findUnique({ where: { id }, include: liveInclude }) ?? live;
  } else if (
    live.status === 'LIVE' &&
    endAtDate &&
    endAtDate <= now
  ) {
    await prisma.live.update({
      where: { id: live.id },
      data: { status: 'ENDED' },
    });
    live = await prisma.live.findUnique({ where: { id }, include: liveInclude }) ?? live;
  }

  const session = await getSession();
  const userId = session?.userId ?? null;
  const canWatch = await canAccessLive(userId, {
    id: live.id,
    requireSubscription: live.requireSubscription,
    allowOneTimePurchase: live.allowOneTimePurchase,
  });

  // Replay tem prioridade: se tem playbackId, exibe replay mesmo que status ainda seja LIVE no banco.
  let hlsUrl: string | null = null;
  if (canWatch) {
    if (live.cloudflarePlaybackId) {
      hlsUrl = await getReplayHlsUrl(live.cloudflarePlaybackId);
    } else if (live.status === 'LIVE' && live.cloudflareLiveInputId) {
      hlsUrl = await getLiveHlsUrl(live.cloudflareLiveInputId);
    }
  }

  const startAt = live.startAt ? new Date(live.startAt) : null;
  const endAt = live.endAt ? new Date(live.endAt) : null;
  const hasReplay = !!live.cloudflarePlaybackId;
  const isLive = live.status === 'LIVE' && !hasReplay;
  const isScheduled = live.status === 'SCHEDULED';
  const isReplay = live.status === 'ENDED' || hasReplay;

  const opts = { day: '2-digit' as const, month: '2-digit' as const, hour: '2-digit' as const, minute: '2-digit' as const, timeZone: 'America/Sao_Paulo' as const };
  const dateLabel =
    startAt || endAt
      ? [
          startAt && `Início: ${startAt.toLocaleString('pt-BR', opts)}`,
          endAt && `Fim: ${endAt.toLocaleString('pt-BR', opts)}`,
        ]
          .filter(Boolean)
          .join(' • ')
      : live.title;

  const teamA =
    live.homeTeam ?
      {
        name: live.homeTeam.name,
        crest: live.homeTeam.crestUrl ?? null,
      }
    : null;
  const teamB =
    live.awayTeam ?
      {
        name: live.awayTeam.name,
        crest: live.awayTeam.crestUrl ?? null,
      }
    : null;

  return (
    <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-gradient-to-b from-[#07130f] via-[#06221a] to-[#081a1a]">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>

        {!canWatch ? (
          <div className="relative w-full overflow-hidden rounded-2xl border border-emerald-400/25 bg-black shadow-[0_18px_60px_rgba(0,0,0,0.9)] shadow-emerald-500/10 aspect-video">
            {live.thumbnailUrl ? (
              <>
                <Image
                  src={live.thumbnailUrl.startsWith('http') ? live.thumbnailUrl : live.thumbnailUrl}
                  alt={live.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8">
                  <h1 className="text-center text-xl font-bold text-white sm:text-2xl md:text-3xl mb-2">
                    {live.title}
                  </h1>
                  {live.description && (
                    <p className="text-center text-sm text-emerald-100/90 max-w-xl mb-6">
                      {live.description}
                    </p>
                  )}
                  <p className="text-center text-lg font-semibold text-white mb-4">
                    Assinatura ou compra necessária para assistir a esta live
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {session ? (
                      <Link
                        href="/planos"
                        className="inline-flex items-center justify-center rounded-full bg-[#19d37a] px-6 py-3 text-sm font-bold text-[#02130b] shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-colors"
                      >
                        Ver planos e patrocinar
                      </Link>
                    ) : (
                      <Link
                        href={`/entrar?redirect=/live/${live.id}`}
                        className="inline-flex items-center justify-center rounded-full bg-[#19d37a] px-6 py-3 text-sm font-bold text-[#02130b] shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-colors"
                      >
                        Entrar ou cadastrar
                      </Link>
                    )}
                    {live.allowOneTimePurchase && (
                      <Link
                        href="/planos"
                        className="inline-flex items-center justify-center rounded-full border-2 border-amber-400/80 px-6 py-3 text-sm font-bold text-amber-300 hover:bg-amber-400/10 transition-colors"
                      >
                        Comprar acesso avulso
                      </Link>
                    )}
                  </div>
                  {live.homeTeam && live.awayTeam && (
                    <h3 className="mt-6 text-center text-2xl font-bold text-emerald-50/95">
                      {live.homeTeam.name}
                      <span className="mx-2 text-emerald-400/80">•</span>
                      {live.awayTeam.name}
                    </h3>
                  )}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                <h1 className="text-center text-xl font-bold text-white sm:text-2xl mb-2">{live.title}</h1>
                <p className="text-emerald-100/90 mb-6">Faça login e assine ou compre acesso para assistir.</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {session ? (
                    <Link
                      href="/planos"
                      className="inline-flex items-center justify-center rounded-full bg-[#19d37a] px-6 py-3 text-sm font-bold text-[#02130b] shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-colors"
                    >
                      Ver planos e patrocinar
                    </Link>
                  ) : (
                    <Link
                      href={`/entrar?redirect=/live/${live.id}`}
                      className="inline-flex items-center justify-center rounded-full bg-[#19d37a] px-6 py-3 text-sm font-bold text-[#02130b] shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-colors"
                    >
                      Entrar ou cadastrar
                    </Link>
                  )}
                </div>
                {live.homeTeam && live.awayTeam && (
                  <h3 className="mt-6 text-center text-2xl font-bold text-emerald-50/95">
                    {live.homeTeam.name}
                    <span className="mx-2 text-emerald-400/80">•</span>
                    {live.awayTeam.name}
                  </h3>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <MatchPlayerPage
              teamA={teamA}
              teamB={teamB}
              title={live.title}
              dateLabel={dateLabel}
              isLive={isLive}
              isScheduled={isScheduled}
              isReplay={isReplay}
              hideScore
              description={live.description}
            >
              <>
                <div className="relative w-full overflow-hidden rounded-2xl border border-emerald-400/25 bg-black shadow-[0_18px_60px_rgba(0,0,0,0.9)] shadow-emerald-500/10">
                {live.status === 'SCHEDULED' && startAt ? (
                  <div className="aspect-video bg-[#0a1f1a] flex items-center justify-center">
                    {live.thumbnailUrl ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={live.thumbnailUrl.startsWith('http') ? live.thumbnailUrl : live.thumbnailUrl}
                          alt=""
                          fill
                          className="object-cover opacity-60"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <LiveScheduledToLivePlayer
                            liveId={live.id}
                            startAt={startAt}
                            title={live.title}
                            thumbnailUrl={live.thumbnailUrl}
                          />
                        </div>
                      </div>
                    ) : (
                      <LiveScheduledToLivePlayer
                        liveId={live.id}
                        startAt={startAt}
                        title={live.title}
                        thumbnailUrl={null}
                      />
                    )}
                  </div>
                ) : live.status === 'LIVE' && hlsUrl ? (
                  <div className="relative">
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white text-sm font-semibold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                      </span>
                      AO VIVO
                    </div>
                    <StreamCustomPlayer hlsUrl={hlsUrl} title={live.title} posterUrl={live.thumbnailUrl ?? undefined} autoplay />
                  </div>
                ) : live.status === 'ENDED' && hlsUrl ? (
                  <div className="relative">
                    <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-[#19d37a] text-[#02130b] text-[11px] font-semibold uppercase">
                      Replay
                    </div>
                    <StreamCustomPlayer hlsUrl={hlsUrl} title={live.title} posterUrl={live.thumbnailUrl ?? undefined} />
                  </div>
                ) : live.status === 'LIVE' && !live.cloudflareLiveInputId ? (
                  <div className="aspect-video bg-[#0a1f1a] flex items-center justify-center">
                    <p className="text-emerald-100/80">Transmissão em breve. Aguarde ou atualize a página.</p>
                  </div>
                ) : (live.status === 'ENDED' || (endAt && endAt <= now)) && !live.cloudflarePlaybackId ? (
                  <div className="aspect-video bg-[#0a1f1a] flex flex-col items-center justify-center gap-6 px-6">
                    <p className="text-emerald-100/90 text-lg text-center">O jogo acabou.</p>
                    <p className="text-emerald-50/80 text-sm text-center max-w-md">
                      Quando o replay estiver disponível, ele aparecerá na home. Você pode assistir de novo por lá.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Link
                        href="/#ultimos-jogos"
                        className="inline-flex items-center justify-center rounded-full bg-[#19d37a] px-6 py-3 text-sm font-bold text-[#02130b] shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-colors"
                      >
                        Ver últimos jogos na home
                      </Link>
                      <Link
                        href="/"
                        className="inline-flex items-center justify-center rounded-full border-2 border-emerald-400/60 px-6 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/10 transition-colors"
                      >
                        Voltar ao início
                      </Link>
                    </div>
                  </div>
                ) : null}
                </div>
                {live.homeTeam && live.awayTeam && (
                  <h3 className="mt-4 text-center text-2xl font-bold text-emerald-50/95">
                    {live.homeTeam.name}
                    <span className="mx-2 text-emerald-400/80">•</span>
                    {live.awayTeam.name}
                  </h3>
                )}
              </>
            </MatchPlayerPage>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs md:text-sm">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0a1f1a]/80 border border-emerald-400/30 text-emerald-100/90">
                <span className="w-2 h-2 rounded-full bg-[#19d37a]" />
                {live.requireSubscription ? 'Disponível para assinantes' : 'Disponível sem assinatura'}
              </span>
              {live.allowOneTimePurchase && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0a1f1a]/80 border border-amber-400/40 text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Acesso avulso disponível
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

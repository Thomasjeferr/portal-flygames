import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSession } from '@/lib/auth';
import { canAccessLive } from '@/lib/access';
import { prisma } from '@/lib/db';
import { getLiveHlsUrl, getReplayHlsUrl } from '@/lib/cloudflare-live';
import { StreamCustomPlayer } from '@/components/StreamCustomPlayer';
import { LiveCountdown } from '@/components/LiveCountdown';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LivePage({ params }: Props) {
  const { id } = await params;
  let live = await prisma.live.findUnique({ where: { id } });
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
    live = await prisma.live.findUnique({ where: { id } }) ?? live;
  } else if (
    live.status === 'LIVE' &&
    endAtDate &&
    endAtDate <= now
  ) {
    await prisma.live.update({
      where: { id: live.id },
      data: { status: 'ENDED' },
    });
    live = await prisma.live.findUnique({ where: { id } }) ?? live;
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

  return (
    <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
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
          <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-8 md:p-12 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{live.title}</h1>
            {live.description && (
              <p className="text-futvar-light mb-6 max-w-xl mx-auto">{live.description}</p>
            )}
            {live.thumbnailUrl && (
              <div className="relative aspect-video max-w-2xl mx-auto rounded-lg overflow-hidden mb-8">
                <Image
                  src={
                    live.thumbnailUrl.startsWith('http')
                      ? live.thumbnailUrl
                      : live.thumbnailUrl
                  }
                  alt={live.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg text-white mb-4">
                      Assinatura ou compra necessária para assistir a esta live
                    </p>
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
                          href={`/entrar?redirect=/live/${live.id}`}
                          className="inline-block px-8 py-4 bg-futvar-green text-futvar-darker font-bold rounded-lg hover:bg-futvar-green-light transition-colors shadow-lg shadow-futvar-green/25"
                        >
                          Entrar ou cadastrar
                        </Link>
                      )}
                      {live.allowOneTimePurchase && (
                        <Link
                          href="/planos"
                          className="inline-block px-6 py-4 border-2 border-futvar-gold/50 text-futvar-gold font-bold rounded-lg hover:bg-futvar-gold/10 transition-colors"
                        >
                          Comprar acesso avulso
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!live.thumbnailUrl && (
              <p className="text-futvar-light">
                Faça login e assine ou compre acesso para assistir.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-2xl overflow-hidden bg-black mb-8 border border-futvar-green/20 shadow-xl">
              {live.status === 'SCHEDULED' && startAt ? (
                <div className="aspect-video bg-futvar-dark flex items-center justify-center">
                  {live.thumbnailUrl ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={
                          live.thumbnailUrl.startsWith('http')
                            ? live.thumbnailUrl
                            : live.thumbnailUrl
                        }
                        alt=""
                        fill
                        className="object-cover opacity-60"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <LiveCountdown startAt={startAt} title={live.title} />
                      </div>
                    </div>
                  ) : (
                    <LiveCountdown startAt={startAt} title={live.title} />
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
                  <StreamCustomPlayer hlsUrl={hlsUrl} title={live.title} />
                </div>
              ) : live.status === 'ENDED' && hlsUrl ? (
                <div className="relative">
                  <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-futvar-dark/80 text-futvar-light text-sm">
                    Replay
                  </div>
                  <StreamCustomPlayer hlsUrl={hlsUrl} title={live.title} />
                </div>
              ) : live.status === 'LIVE' && !live.cloudflareLiveInputId ? (
                <div className="aspect-video bg-futvar-dark flex items-center justify-center">
                  <p className="text-futvar-light">Transmissão em breve. Aguarde ou atualize a página.</p>
                </div>
              ) : (live.status === 'ENDED' || (endAt && endAt <= now)) && !live.cloudflarePlaybackId ? (
                <div className="aspect-video bg-futvar-dark flex flex-col items-center justify-center gap-6 px-6">
                  <p className="text-futvar-light text-lg text-center">
                    O jogo acabou.
                  </p>
                  <p className="text-futvar-light/80 text-sm text-center max-w-md">
                    Quando o replay estiver disponível, ele aparecerá na home. Você pode assistir de novo por lá.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/#ultimos-jogos"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-futvar-green text-futvar-darker font-bold rounded-lg hover:bg-futvar-green-light transition-colors"
                    >
                      Ver últimos jogos na home
                    </Link>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 px-6 py-3 border border-futvar-green/50 text-futvar-green font-semibold rounded-lg hover:bg-futvar-green/10 transition-colors"
                    >
                      Voltar ao início
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 md:space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  {live.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      isLive
                        ? 'bg-red-600/15 text-red-300 border border-red-500/50'
                        : isScheduled
                        ? 'bg-amber-500/10 text-amber-200 border border-amber-400/40'
                        : 'bg-futvar-gray text-futvar-light border border-white/10'
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isLive ? 'bg-red-400 animate-ping' : 'bg-futvar-green/60'
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          isLive ? 'bg-red-200' : 'bg-futvar-green'
                        }`}
                      />
                    </span>
                    {isLive ? 'Ao vivo agora' : isScheduled ? 'Live agendada' : 'Replay disponível'}
                  </span>
                  <span className="hidden md:inline-block h-4 w-px bg-futvar-light/30" aria-hidden />
                  <span className="text-xs md:text-sm text-futvar-light">
                    {startAt && (
                      <>
                        Início:{' '}
                        {startAt.toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </>
                    )}
                    {endAt && (
                      <>
                        {' '}
                        • Fim:{' '}
                        {endAt.toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-futvar-light">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-futvar-dark border border-futvar-green/20">
                  <span className="w-2 h-2 rounded-full bg-futvar-green" />
                  {live.requireSubscription
                    ? 'Disponível para assinantes'
                    : 'Disponível sem assinatura'}
                </span>
                {live.allowOneTimePurchase && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-futvar-dark border border-futvar-gold/40 text-futvar-gold">
                    <span className="w-2 h-2 rounded-full bg-futvar-gold" />
                    Acesso avulso disponível
                  </span>
                )}
              </div>

              {live.description && (
                <p className="text-futvar-light leading-relaxed max-w-3xl">
                  {live.description}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

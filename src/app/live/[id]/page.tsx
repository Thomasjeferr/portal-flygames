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
  const live = await prisma.live.findUnique({ where: { id } });
  if (!live) notFound();

  const session = await getSession();
  const userId = session?.userId ?? null;
  const canWatch = await canAccessLive(userId, {
    id: live.id,
    requireSubscription: live.requireSubscription,
    allowOneTimePurchase: live.allowOneTimePurchase,
  });

  let hlsUrl: string | null = null;
  if (canWatch) {
    if (live.status === 'LIVE' && live.cloudflareLiveInputId) {
      hlsUrl = getLiveHlsUrl(live.cloudflareLiveInputId);
    } else if (live.status === 'ENDED' && live.cloudflarePlaybackId) {
      hlsUrl = getReplayHlsUrl(live.cloudflarePlaybackId);
    }
  }

  const startAt = live.startAt ? new Date(live.startAt) : null;

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
              ) : live.status === 'ENDED' && !live.cloudflarePlaybackId ? (
                <div className="aspect-video bg-futvar-dark flex items-center justify-center">
                  <p className="text-futvar-light">Replay não disponível.</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white">{live.title}</h1>
              {live.description && (
                <p className="text-futvar-light leading-relaxed max-w-3xl">{live.description}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

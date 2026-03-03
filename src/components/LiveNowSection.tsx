'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { formatLiveCardDate } from '@/lib/liveTimezone';

type Team = { id: string; name: string; shortName: string | null } | null;

type LiveHighlight = {
  mode: 'LIVE' | 'SCHEDULED' | 'NONE';
  live: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    startAt: string | null;
    homeTeam?: Team;
    awayTeam?: Team;
  } | null;
};

const ArrowUpRight = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const POLL_INTERVAL_MS = 45_000; // 45 segundos

export function LiveNowSection() {
  const [data, setData] = useState<LiveHighlight | null>(null);
  const [justWentLive, setJustWentLive] = useState(false);

  useEffect(() => {
    const fetchHighlight = () => {
      fetch('/api/public/live-highlight', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (!d || d.mode === 'NONE') {
            setData(d ?? { mode: 'NONE', live: null });
            return;
          }
          setData((prev) => {
            const wasScheduled = prev?.mode === 'SCHEDULED';
            const nowLive = d.mode === 'LIVE';
            if (wasScheduled && nowLive) setJustWentLive(true);
            return d;
          });
        })
        .catch(() => setData({ mode: 'NONE', live: null }));
    };

    fetchHighlight();
    const interval = setInterval(fetchHighlight, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!justWentLive) return;
    const t = setTimeout(() => setJustWentLive(false), 5000);
    return () => clearTimeout(t);
  }, [justWentLive]);

  if (!data || data.mode === 'NONE' || !data.live) return null;

  const isLive = data.mode === 'LIVE';
  const live = data.live;
  const dateStr = formatLiveCardDate(live.startAt);

  return (
    <section className="py-8 px-4 lg:px-12 bg-futvar-darker/50">
      {justWentLive && (
        <div className="mb-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg animate-pulse">
            <span className="h-2 w-2 rounded-full bg-white" />
            Agora ao vivo!
          </span>
        </div>
      )}
      <div className="max-w-[1920px] mx-auto flex justify-start">
        <Link
          href={`/live/${live.id}`}
          className={`group relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
            ${isLive
              ? 'border-red-500/20 bg-gradient-to-br from-futvar-dark to-futvar-darker/80 shadow-lg shadow-red-500/5'
              : 'border-amber-400/30 bg-gradient-to-br from-futvar-dark to-futvar-darker/80 shadow-lg shadow-amber-500/10'
            }`}
        >
          {/* Barra vertical esquerda */}
          <span
            className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${isLive ? 'bg-red-500' : 'bg-amber-400'}`}
            aria-hidden
          />

          <div className="pl-5 flex flex-col min-h-0">
            {/* Topo: título da seção + badge */}
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-3">
              {isLive ? 'Ao vivo' : 'Agendado'}
            </h2>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 w-fit rounded-full bg-red-600 px-4 py-1.5 text-sm font-bold text-white mb-4">
                <span className="h-2 w-2 rounded-full bg-white shrink-0" />
                AO VIVO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 w-fit rounded-full border border-amber-400/80 bg-amber-900/80 px-4 py-1.5 text-sm font-medium text-amber-300 mb-4">
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                Próximo jogo ao vivo
              </span>
            )}

            {/* Conteúdo: mobile empilhado (imagem topo, conteúdo abaixo), desktop lado a lado (imagem esquerda, conteúdo direita) */}
            <div className="flex flex-col lg:flex-row gap-6 flex-1">
              {/* Imagem */}
              <div
                className={`relative w-full lg:w-[45%] flex-shrink-0 aspect-video lg:aspect-auto lg:min-h-[200px] rounded-xl overflow-hidden bg-black/40 ${
                  isLive ? 'shadow-[0_8px_24px_-8px_rgba(239,68,68,0.25)]' : 'shadow-[0_8px_24px_-8px_rgba(251,191,36,0.2)]'
                }`}
              >
                {live.thumbnailUrl ? (
                  <Image
                    src={live.thumbnailUrl}
                    alt={live.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 45vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-futvar-light text-sm">
                    Live
                  </div>
                )}
                {/* Overlay gradient escuro na parte inferior */}
                <div
                  className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"
                  aria-hidden
                />
              </div>

              {/* Conteúdo do card */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <h3 className={`text-xl lg:text-2xl font-bold text-white line-clamp-2 ${live.homeTeam && live.awayTeam ? 'mb-2' : 'mb-4'}`}>
                  {live.title}
                </h3>
                {live.homeTeam && live.awayTeam && (
                  <h5 className="text-base lg:text-lg font-semibold text-white/90 mb-4">
                    {live.homeTeam.name}
                    <span className={`mx-2 ${isLive ? 'text-futvar-green/90' : 'text-amber-400'}`}>vs</span>
                    {live.awayTeam.name}
                  </h5>
                )}

                {isLive ? (
                  <>
                    <span className="inline-flex w-fit rounded-lg bg-red-600/90 px-3 py-1 text-xs font-bold text-white mb-4">
                      AGORA
                    </span>
                    <span className="inline-flex items-center justify-center gap-2 w-full lg:w-auto mt-auto py-3 px-6 rounded-xl text-sm font-bold bg-red-600 text-white transition-colors hover:bg-red-700">
                      Assistir agora
                    </span>
                  </>
                ) : (
                  <>
                    {dateStr && (
                      <span className="inline-flex w-fit rounded-full border border-amber-400/80 bg-amber-900/80 px-4 py-2 text-sm font-medium text-amber-300 mb-4">
                        {dateStr}
                      </span>
                    )}
                    <span className="inline-flex items-center justify-center gap-2 w-full lg:w-auto mt-auto py-3 px-6 rounded-xl text-sm font-bold bg-futvar-green text-futvar-darker transition-colors hover:brightness-95 hover:shadow-md">
                      Promover Time
                      <ArrowUpRight />
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

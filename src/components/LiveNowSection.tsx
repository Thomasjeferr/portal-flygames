'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type LiveHighlight = {
  mode: 'LIVE' | 'SCHEDULED' | 'NONE';
  live: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    startAt: string | null;
  } | null;
};

export function LiveNowSection() {
  const [data, setData] = useState<LiveHighlight | null>(null);

  useEffect(() => {
    fetch('/api/public/live-highlight', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ mode: 'NONE', live: null }));
  }, []);

  if (!data || data.mode === 'NONE' || !data.live) return null;

  const isLive = data.mode === 'LIVE';
  const startAtStr = data.live.startAt
    ? new Date(data.live.startAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <section className="py-8 px-4 lg:px-12 bg-futvar-darker/50">
      <div className="max-w-[1920px] mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-1 h-8 rounded-full ${isLive ? 'bg-red-500' : 'bg-amber-500'}`} />
          <h2 className="text-xl lg:text-2xl font-bold text-white">
            {isLive ? 'Ao vivo agora' : 'Próxima live'}
          </h2>
        </div>
        <Link
          href={`/live/${data.live.id}`}
          className="block bg-futvar-dark border border-futvar-green/20 rounded-2xl overflow-hidden hover:border-futvar-green/50 transition-colors"
        >
          <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6">
            <div className="relative w-full sm:w-72 aspect-video sm:aspect-auto sm:h-40 flex-shrink-0 rounded-xl overflow-hidden bg-black/40">
              {data.live.thumbnailUrl ? (
                <Image
                  src={data.live.thumbnailUrl}
                  alt={data.live.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 288px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-futvar-light text-sm">
                  Live
                </div>
              )}
              {isLive && (
                <span className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-600 text-white text-xs font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-300 animate-ping opacity-70" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-200 animate-live-blink" />
                  </span>
                  AO VIVO
                </span>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white line-clamp-2">
                {data.live.title}
              </h3>
              {startAtStr && (
                <p className="text-futvar-light text-sm mt-1">
                  {isLive ? `Iniciada em ${startAtStr}` : `Horário: ${startAtStr}`}
                </p>
              )}
              <span
                className={`mt-3 inline-flex items-center justify-center w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  isLive
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'bg-futvar-green text-futvar-darker hover:bg-futvar-green-light'
                }`}
              >
                {isLive ? 'Assistir agora' : 'Ver detalhes'}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { VideoPlayer } from '@/components/VideoPlayer';
import { isStreamVideo } from '@/lib/cloudflare-stream';

export type GameHighlightPublic = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  order: number;
};

function formatDuration(sec: number | null): string {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function GameHighlightsSection({
  highlights,
  gameSlug,
  className = '',
}: {
  highlights: GameHighlightPublic[];
  gameSlug: string;
  className?: string;
}) {
  const [modalHighlight, setModalHighlight] = useState<GameHighlightPublic | null>(null);

  if (!highlights || highlights.length === 0) return null;

  return (
    <section className={`mt-12 pt-10 border-t border-white/10 lg:mt-0 lg:pt-0 lg:border-t-0 ${className}`.trim()}>
      <h2 className="text-xl font-bold text-white mb-2">Melhores momentos</h2>
      <p className="text-futvar-light text-sm mb-6">Cortes e melhores lances</p>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {highlights.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => setModalHighlight(h)}
            className="flex-shrink-0 w-[280px] sm:w-[320px] rounded-xl overflow-hidden border border-white/10 bg-futvar-dark hover:border-emerald-400/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-left focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
          >
            <div className="relative aspect-video bg-black">
              {h.thumbnailUrl ? (
                <Image
                  src={h.thumbnailUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 280px, 320px"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f1a] to-[#07130f]" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-futvar-darker ml-0.5">
                    <path d="M8 5v14l11-7z" fill="currentColor" />
                  </svg>
                </div>
              </div>
              {h.durationSec != null && h.durationSec > 0 && (
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
                  {formatDuration(h.durationSec)}
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-white font-semibold truncate">{h.title}</p>
            </div>
          </button>
        ))}
      </div>

      {modalHighlight && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label={`Assistir: ${modalHighlight.title}`}
        >
          <button
            type="button"
            onClick={() => setModalHighlight(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />
            </svg>
          </button>
          <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black border border-emerald-400/25 shadow-2xl">
            <VideoPlayer
              videoUrl={modalHighlight.videoUrl}
              title={modalHighlight.title}
              posterUrl={modalHighlight.thumbnailUrl ?? undefined}
              streamContext={isStreamVideo(modalHighlight.videoUrl) ? { gameSlug } : undefined}
            />
          </div>
        </div>
      )}
    </section>
  );
}

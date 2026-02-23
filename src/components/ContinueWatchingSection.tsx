'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type ContinueWatchingItem = {
  gameId: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  championship: string;
  positionSeconds: number;
  durationSeconds?: number;
  updatedAt: string;
};

export function ContinueWatchingSection() {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me/continue-watching', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setItems(Array.isArray(d.items) ? d.items : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || items.length === 0) return null;

  const getProgressPercent = (pos: number, dur?: number) => {
    if (dur != null && dur > 0) return Math.min(100, Math.round((pos / dur) * 100));
    return 0;
  };

  return (
    <section className="py-8 px-4 lg:px-12 bg-futvar-darker/50">
      <div className="max-w-[1920px] mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-1 h-8 rounded-full bg-futvar-green" />
          <h2 className="text-xl lg:text-2xl font-bold text-white">
            Continuar assistindo
          </h2>
        </div>
        <div className="overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="flex gap-4" style={{ width: 'max-content', minWidth: '100%' }}>
            {items.map((item) => {
              const percent = getProgressPercent(item.positionSeconds, item.durationSeconds);
              return (
                <Link
                  key={item.gameId}
                  href={`/jogo/${item.slug}`}
                  className="flex-shrink-0 w-[280px] sm:w-[320px] group block"
                >
                  <div className="bg-futvar-dark border border-futvar-green/20 rounded-xl overflow-hidden hover:border-futvar-green/50 transition-colors">
                    <div className="flex">
                      <div className="relative w-28 sm:w-32 flex-shrink-0 aspect-video bg-black/40">
                        {item.thumbnailUrl ? (
                          <Image
                            src={item.thumbnailUrl}
                            alt={item.title}
                            fill
                            className="object-cover group-hover:scale-[1.02] transition-transform"
                            sizes="128px"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-futvar-light text-xs">
                            Jogo
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                        <p className="text-white font-semibold text-sm line-clamp-2 group-hover:text-futvar-green transition-colors">
                          {item.title}
                        </p>
                        {item.championship && (
                          <p className="text-futvar-light text-xs mt-0.5 truncate">
                            {item.championship}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="h-1 bg-white/10">
                      <div
                        className="h-full bg-futvar-green transition-all"
                        style={{ width: `${percent > 0 ? percent : 0}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

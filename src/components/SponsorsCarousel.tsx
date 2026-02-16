'use client';

import Image from 'next/image';
import { useRef, useEffect, useState } from 'react';

type Sponsor = {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
};

function isValidLogoUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== 'string') return false;
  const s = url.trim();
  return s.length > 0 && (s.startsWith('http') || s.startsWith('/') || s.startsWith('data:'));
}

export function SponsorsCarousel({
  sponsors,
  className = '',
}: {
  sponsors: Sponsor[];
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [sponsors]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  const valid = sponsors.filter((s) => isValidLogoUrl(s.logoUrl));
  if (valid.length === 0) return null;

  return (
    <div className={`relative group ${className}`}>
      {valid.length > 2 && (
        <>
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Anterior"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 disabled:pointer-events-none"
            disabled={!canScrollLeft}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Próximo"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 disabled:pointer-events-none"
            disabled={!canScrollRight}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
      <div
        ref={scrollRef}
        className="flex gap-8 overflow-x-auto scroll-smooth scrollbar-hide py-4 px-1"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {valid.map((s) => {
          const logoUrl = s.logoUrl.trim();
          const Wrapper = s.websiteUrl ? 'a' : 'div';
          return (
            <Wrapper
              key={s.id}
              {...(s.websiteUrl
                ? {
                    href: s.websiteUrl,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  }
                : {})}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-2 min-w-[140px] snap-start transition-opacity duration-300 hover:opacity-100 opacity-90"
            >
              <div className="flex items-center justify-center h-20 w-[180px]">
                <Image
                  src={logoUrl}
                  alt={s.name}
                  width={180}
                  height={80}
                  className="object-contain h-20 w-auto max-w-[180px]"
                  unoptimized={logoUrl.startsWith('http')}
                />
              </div>
              <span className="text-sm text-white/80 font-medium text-center max-w-[160px] truncate">
                {s.name}
              </span>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}

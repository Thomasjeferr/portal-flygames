'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

const SCROLL_STEP = 280;
const HOVER_INTERVAL_MS = 80;

interface CarouselWithArrowsProps {
  children: React.ReactNode;
  className?: string;
  /** Mostrar setas só em telas pequenas (ignorado quando há detecção de overflow) */
  arrowsOnlyOnSmall?: boolean;
}

function useHasOverflow(ref: React.RefObject<HTMLDivElement | null>) {
  const [hasOverflow, setHasOverflow] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setHasOverflow(el.scrollWidth > el.clientWidth);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    const t = setTimeout(check, 150);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const onScroll = () => check();
    el.addEventListener('scroll', onScroll);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      el.removeEventListener('scroll', onScroll);
    };
  }, [ref, check]);

  return hasOverflow;
}

export function CarouselWithArrows({
  children,
  className = '',
  arrowsOnlyOnSmall = false,
}: CarouselWithArrowsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasOverflow = useHasOverflow(scrollRef);
  const hoverInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const scroll = useCallback((direction: 'prev' | 'next') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = direction === 'next' ? SCROLL_STEP : -SCROLL_STEP;
    el.scrollBy({ left: step, behavior: 'auto' });
  }, []);

  const startHoverScroll = useCallback(
    (direction: 'prev' | 'next') => {
      if (hoverInterval.current) return;
      hoverInterval.current = setInterval(() => scroll(direction), HOVER_INTERVAL_MS);
    },
    [scroll]
  );

  const stopHoverScroll = useCallback(() => {
    if (hoverInterval.current) {
      clearInterval(hoverInterval.current);
      hoverInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopHoverScroll();
  }, [stopHoverScroll]);

  const showArrows = hasOverflow;

  return (
    <div className="relative group/carousel overflow-visible">
      {showArrows && (
        <>
          <button
            type="button"
            aria-label="Ver jogos anteriores"
            className="absolute left-0 top-0 bottom-0 z-20 w-10 flex items-center justify-center bg-futvar-darker/95 hover:bg-futvar-green text-white rounded-r-lg transition-colors shadow-lg border border-white/10 cursor-pointer"
            onMouseEnter={() => startHoverScroll('prev')}
            onMouseLeave={stopHoverScroll}
            onClick={() => scroll('prev')}
          >
            <span className="text-2xl font-bold leading-none" aria-hidden>‹</span>
          </button>
          <button
            type="button"
            aria-label="Ver mais jogos"
            className="absolute right-0 top-0 bottom-0 z-20 w-10 flex items-center justify-center bg-futvar-darker/95 hover:bg-futvar-green text-white rounded-l-lg transition-colors shadow-lg border border-white/10 cursor-pointer"
            onMouseEnter={() => startHoverScroll('next')}
            onMouseLeave={stopHoverScroll}
            onClick={() => scroll('next')}
          >
            <span className="text-2xl font-bold leading-none" aria-hidden>›</span>
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        className={`overflow-x-auto overflow-y-hidden scroll-smooth scrollbar-hide pb-2 -mx-4 lg:mx-0 ${
          showArrows ? 'pl-12 pr-12 lg:pl-12 lg:pr-12' : 'pl-4 pr-4 lg:pl-0 lg:pr-0'
        } ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

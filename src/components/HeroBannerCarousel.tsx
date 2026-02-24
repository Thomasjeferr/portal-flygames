'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { extractYouTubeVideoId } from '@/lib/youtube';

type Banner = {
  id: string;
  type: string;
  badgeText: string | null;
  headline: string | null;
  subheadline: string | null;
  primaryCta: { text: string; url: string };
  secondaryCta: { text: string; url: string } | null;
  mediaType: string;
  mediaUrl: string | null;
  mobileMediaType?: string;
  mobileMediaUrl?: string | null;
  videoStartSeconds: number;
  videoEndSeconds: number | null;
  loop: boolean;
  mute: boolean;
  overlayColorHex: string;
  overlayOpacity: number;
  heightPreset?: string;
  secondaryMediaType?: string;
  secondaryMediaUrl?: string | null;
  customHeightPx?: number | null;
};

type Response = {
  banners: Banner[];
  fallback?: {
    badgeText: string;
    headline: string;
    subheadline: string;
    description: string;
    primaryCta: { text: string; url: string };
    secondaryCta: { text: string; url: string };
  };
};

const AUTOPLAY_MS = 6000;

function buildYouTubeEmbedParams(
  videoId: string,
  opts: { mute: boolean; loop: boolean; startSeconds?: number; endSeconds?: number | null }
): URLSearchParams {
  const p = new URLSearchParams({
    controls: '0',
    modestbranding: '1',
    rel: '0',
    showinfo: '0',
    fs: '0',
    disablekb: '1',
    playsinline: '1',
    autoplay: '1',
    mute: opts.mute ? '1' : '0',
  });
  if (opts.loop) {
    p.set('loop', '1');
    p.set('playlist', videoId);
  }
  if ((opts.startSeconds ?? 0) > 0) p.set('start', String(opts.startSeconds));
  if (opts.endSeconds != null) p.set('end', String(opts.endSeconds));
  return p;
}

const HEIGHT_CLASSES: Record<string, string> = {
  sm: 'min-h-[24rem]',
  md: 'min-h-[28rem]',
  lg: 'min-h-[36rem]',
  xl: 'min-h-[44rem]',
  full: 'min-h-[100vh]',
};

const MOBILE_BREAKPOINT = 768;

export function HeroBannerCarousel() {
  const [data, setData] = useState<Response | null>(null);
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const set = () => setIsMobile(mq.matches);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);

  useEffect(() => {
    fetch('/api/public/home-banners', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ banners: [] }));
  }, []);

  useEffect(() => {
    if (!data?.banners?.length || hovering) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % data.banners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [data?.banners?.length, hovering]);

  if (!data) {
    return <HeroFallback />;
  }

  if (data.banners.length === 0) {
    return (
      <HeroFallback
        badgeText={data.fallback?.badgeText}
        headline={data.fallback?.headline}
        subheadline={data.fallback?.subheadline}
        description={data.fallback?.description}
        primaryCta={data.fallback?.primaryCta}
        secondaryCta={data.fallback?.secondaryCta}
      />
    );
  }

  const banner = data.banners[index];
  const overlayStyle = {
    backgroundColor: banner.overlayColorHex,
    opacity: banner.overlayOpacity / 100,
  };

  const useMobileMedia =
    isMobile &&
    banner.mobileMediaType &&
    banner.mobileMediaType !== 'NONE' &&
    banner.mobileMediaUrl?.trim();
  const effectiveMediaType = useMobileMedia ? banner.mobileMediaType! : banner.mediaType;
  const effectiveMediaUrl = useMobileMedia ? banner.mobileMediaUrl! : banner.mediaUrl;
  const imgErrorKey = useMobileMedia ? `${banner.id}-mobile` : banner.id;

  let mediaEl: React.ReactNode = null;
  if (effectiveMediaType === 'IMAGE' && effectiveMediaUrl && !imgError[imgErrorKey]) {
    mediaEl = (
      <div className="absolute inset-0">
        <Image
          src={effectiveMediaUrl}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
          onError={() => setImgError((e) => ({ ...e, [imgErrorKey]: true }))}
        />
      </div>
    );
  } else if (effectiveMediaType === 'YOUTUBE_VIDEO' && effectiveMediaUrl) {
    const ytId = extractYouTubeVideoId(effectiveMediaUrl);
    if (ytId) {
      const params = buildYouTubeEmbedParams(ytId, {
        mute: banner.mute,
        loop: banner.loop,
        startSeconds: banner.videoStartSeconds,
        endSeconds: banner.videoEndSeconds,
      });
      mediaEl = (
        <div className="absolute inset-0 min-w-full min-h-full overflow-hidden pointer-events-none">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?${params}`}
            title=""
            className="absolute left-1/2 top-1/2 min-w-[100vw] min-h-[56.25vw] w-[177.78vh] h-[100vh] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ border: 0 }}
            allow="autoplay; encrypted-media"
          />
        </div>
      );
    }
  } else if (effectiveMediaType === 'MP4_VIDEO' && effectiveMediaUrl) {
    mediaEl = (
      <div className="absolute inset-0 pointer-events-none">
        <video
          src={effectiveMediaUrl}
          autoPlay
          muted={banner.mute}
          loop={banner.loop}
          playsInline
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          className="absolute inset-0 w-full h-full object-cover [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-enclosure]:hidden"
        />
      </div>
    );
  }

  if (!mediaEl) {
    mediaEl = (
      <>
        <div className="absolute inset-0 bg-hero-pattern field-pattern" />
        <div className="absolute inset-0 bg-grass-gradient" />
      </>
    );
  }

  const heightPreset = banner.heightPreset ?? 'md';
  const heightClass = HEIGHT_CLASSES[heightPreset] ?? HEIGHT_CLASSES.md;
  const inlineMinHeight =
    typeof banner.customHeightPx === 'number' && banner.customHeightPx > 0
      ? { minHeight: `${banner.customHeightPx}px` }
      : undefined;
  const hasJanelinha =
    banner.secondaryMediaType &&
    banner.secondaryMediaType !== 'NONE' &&
    banner.secondaryMediaUrl?.trim();

  let janelinhaEl: React.ReactNode = null;
  if (hasJanelinha && banner.secondaryMediaUrl) {
    if (banner.secondaryMediaType === 'IMAGE') {
      janelinhaEl = (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
          <Image src={banner.secondaryMediaUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" onError={() => {}} />
        </div>
      );
    } else if (banner.secondaryMediaType === 'YOUTUBE_VIDEO') {
      const ytId = extractYouTubeVideoId(banner.secondaryMediaUrl);
      if (ytId) {
        const params = buildYouTubeEmbedParams(ytId, {
          mute: true,
          loop: true,
          startSeconds: banner.videoStartSeconds,
          endSeconds: banner.videoEndSeconds,
        });
        janelinhaEl = (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-xl pointer-events-none">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?${params}`}
              title=""
              className="absolute inset-0 w-full h-full pointer-events-none"
              allow="autoplay; encrypted-media"
            />
          </div>
        );
      }
    } else if (banner.secondaryMediaType === 'MP4_VIDEO') {
      janelinhaEl = (
        <JanelinhaMP4Video
          src={banner.secondaryMediaUrl}
          loop={banner.loop}
          startSeconds={banner.videoStartSeconds}
          endSeconds={banner.videoEndSeconds}
        />
      );
    }
  }

  return (
    <section
      className={`relative flex items-center justify-start pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-32 lg:pb-24 px-4 sm:px-6 lg:px-12 overflow-hidden ${heightClass}`}
      style={inlineMinHeight}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {mediaEl}
      <div className="absolute inset-0" style={overlayStyle} aria-hidden />
      <div className="relative max-w-[1920px] mx-auto z-10 flex flex-col lg:flex-row items-start lg:items-stretch justify-start lg:justify-between gap-6 sm:gap-8 w-full flex-1">
        <div className={`${hasJanelinha ? 'lg:max-w-[55%]' : ''} w-full max-w-2xl flex flex-col items-center lg:items-start justify-center text-center lg:text-left gap-3 sm:gap-4`}>
          {banner.badgeText && (
            <span className="inline-block px-3 py-1 rounded-full bg-futvar-green/20 text-futvar-green text-xs font-semibold w-fit border border-futvar-green/30">
              {banner.badgeText}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight">
            {banner.headline || 'Fly Games'}
            {banner.subheadline && <span className="block text-futvar-green mt-1 text-xl sm:text-2xl lg:text-3xl">{banner.subheadline}</span>}
          </h1>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <Link
              href={banner.primaryCta.url}
              className="px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold text-base hover:bg-futvar-green-light transition-colors shadow-lg shadow-futvar-green/25"
            >
              {banner.primaryCta.text}
            </Link>
            {banner.secondaryCta && (
              <Link
                href={banner.secondaryCta.url}
                className="px-6 py-3 rounded-lg border-2 border-futvar-green/50 text-futvar-green font-bold text-base hover:bg-futvar-green/10 transition-colors"
              >
                {banner.secondaryCta.text}
              </Link>
            )}
          </div>
        </div>
        {hasJanelinha && janelinhaEl && (
          <div className="w-full lg:w-[42%] lg:min-w-[280px] lg:max-w-[520px] shrink-0">{janelinhaEl}</div>
        )}
      </div>
      {data.banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {data.banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-futvar-green' : 'bg-white/50'}`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function JanelinhaMP4Video({
  src,
  loop,
  startSeconds,
  endSeconds,
}: {
  src: string;
  loop: boolean;
  startSeconds: number;
  endSeconds: number | null;
}) {
  const vidRef = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    const handleTimeUpdate = () => {
      if (endSeconds != null && v.currentTime >= endSeconds) {
        v.currentTime = startSeconds;
        v.play();
      }
    };
    v.addEventListener('timeupdate', handleTimeUpdate);
    return () => v.removeEventListener('timeupdate', handleTimeUpdate);
  }, [startSeconds, endSeconds]);
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-xl pointer-events-none">
      <video
        ref={vidRef}
        src={src}
        autoPlay
        muted
        loop={loop && endSeconds == null}
        playsInline
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (startSeconds > 0) v.currentTime = startSeconds;
        }}
        className="absolute inset-0 w-full h-full object-cover [&::-webkit-media-controls]:hidden [&::-webkit-media-controls-enclosure]:hidden"
      />
    </div>
  );
}

function HeroFallback(props?: {
  badgeText?: string;
  headline?: string;
  subheadline?: string;
  description?: string;
  primaryCta?: { text: string; url: string };
  secondaryCta?: { text: string; url: string };
}) {
  const badge = props?.badgeText ?? 'FILMAGEM COM DRONES';
  const headline = props?.headline ?? 'Futebol Amador';
  const subheadline = props?.subheadline ?? 'visão aérea';
  const desc = props?.description ?? 'Assista às melhores partidas filmadas com drones. Cada lance com a emoção de quem está em campo — do céu.';
  const primary = props?.primaryCta ?? { text: 'Começar a assistir', url: '/cadastro' };
  const secondary = props?.secondaryCta ?? { text: 'Já tenho conta', url: '/entrar' };

  return (
    <section className="relative flex items-center justify-center pt-24 pb-16 lg:pt-32 lg:pb-24 px-4 lg:px-12 overflow-hidden min-h-[28rem]">
      <div className="absolute inset-0 bg-hero-pattern field-pattern" />
      <div className="absolute inset-0 bg-grass-gradient" />
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div className="relative max-w-[1920px] mx-auto z-10 flex flex-col items-center justify-center text-center w-full">
        <div className="max-w-2xl">
          <span className="inline-block px-3 py-1 rounded-full bg-futvar-green/20 text-futvar-green text-xs font-semibold mb-4 border border-futvar-green/30">
            {badge}
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            {headline}
            <span className="block text-futvar-green text-xl sm:text-2xl lg:text-3xl mt-1">{subheadline}</span>
          </h1>
          <p className="text-base sm:text-lg text-futvar-light mb-6 max-w-xl mx-auto">{desc}</p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <Link
              href={primary.url}
              className="px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold text-base hover:bg-futvar-green-light transition-colors shadow-lg shadow-futvar-green/25"
            >
              {primary.text}
            </Link>
            <Link
              href={secondary.url}
              className="px-6 py-3 rounded-lg border-2 border-futvar-green/50 text-futvar-green font-bold text-base hover:bg-futvar-green/10 transition-colors"
            >
              {secondary.text}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';

interface TeamCrestLogoProps {
  name: string;
  shortName?: string | null;
  crestUrl?: string | null;
  className?: string;
}

function fullUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (typeof window !== 'undefined') {
    const base = window.location.origin;
    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  }
  return url.startsWith('/') ? url : `/${url}`;
}

export function TeamCrestLogo({ name, shortName, crestUrl, className = 'h-16 w-16 object-contain rounded' }: TeamCrestLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = fullUrl(crestUrl);
  const showImg = !!src && !imgFailed;
  const initials = (shortName || name).slice(0, 2).toUpperCase();

  if (showImg) {
    return (
      <img
        src={src!}
        alt=""
        className={className}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-white/10 text-white font-bold shrink-0 ${className}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

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
  // SSR: retorna URL absoluta usando variável de ambiente ou path relativo (o browser resolve)
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

const DEFAULT_SIZE = 'h-16 w-16 min-h-[4rem] min-w-[4rem]';

export function TeamCrestLogo({ name, shortName, crestUrl, className = '' }: TeamCrestLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = fullUrl(crestUrl);
  const showImg = !!src && !imgFailed;
  const initials = (shortName || name).slice(0, 2).toUpperCase();
  if (showImg) {
    return (
      <span className={`block shrink-0 ${DEFAULT_SIZE} rounded overflow-hidden bg-white/5`} role="img" aria-label={name}>
        <img
          src={src!}
          alt=""
          className="w-full h-full object-contain"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-white/20 text-white font-bold text-xl shrink-0 border border-white/20 ${DEFAULT_SIZE} ${className}`.trim()}
      role="img"
      aria-label={name}
    >
      {initials}
    </span>
  );
}

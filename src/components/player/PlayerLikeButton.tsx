'use client';

import React, { useEffect, useState } from 'react';

interface PlayerLikeButtonProps {
  /** GET count + userLiked, POST toggle */
  apiBasePath: string;
  className?: string;
  /** Classe quando curtido */
  activeClassName?: string;
}

export function PlayerLikeButton({
  apiBasePath,
  className = '',
  activeClassName = '',
}: PlayerLikeButtonProps) {
  const [count, setCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    fetch(apiBasePath, { credentials: 'include' })
      .then(async (r) => {
        const text = await r.text();
        const d = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
        return { ok: r.ok, status: r.status, data: d };
      })
      .then(({ ok, data }) => {
        if (ok) {
          setCount(data.count ?? 0);
          setUserLiked(!!data.userLiked);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [apiBasePath]);

  const handleToggle = async () => {
    if (loading || fetching) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(apiBasePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const text = await res.text();
      const data = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
      if (res.ok) {
        setUserLiked(!!data.liked);
        setCount((c) => (data.liked ? c + 1 : Math.max(0, c - 1)));
      } else if (res.status === 401) {
        setError(data.error || 'Faça login para curtir.');
        window.location.href = `/entrar?redirect=${encodeURIComponent(window.location.pathname)}`;
      } else {
        setError(data.error || 'Erro ao processar curtida.');
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <span className={className}>
        <span className="opacity-60">—</span> curtidas
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 ${userLiked ? activeClassName : className}`}
        aria-label={userLiked ? 'Descurtir' : 'Curtir'}
      >
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill={userLiked ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span>{count}</span>
      </button>
      {error && <p className="text-amber-300 text-xs">{error}</p>}
    </span>
  );
}

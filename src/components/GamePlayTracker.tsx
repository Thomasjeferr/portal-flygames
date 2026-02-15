'use client';

import { useEffect, useRef } from 'react';

export function GamePlayTracker({ gameId }: { gameId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!gameId || tracked.current) return;
    tracked.current = true;
    fetch('/api/track-play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId }),
    }).catch(() => {});
  }, [gameId]);

  return null;
}

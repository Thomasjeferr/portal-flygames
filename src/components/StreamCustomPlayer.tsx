'use client';

import { VideoPlayerCard } from '@/components/player/VideoPlayerCard';

interface StreamCustomPlayerProps {
  hlsUrl: string;
  title: string;
  /** Thumb inicial exibida antes do primeiro play. */
  posterUrl?: string;
  /** Posição inicial em segundos (Continuar assistindo). */
  initialTimeSeconds?: number;
  /** Se informado, salva progresso periodicamente em /api/me/watch-progress. */
  gameId?: string;
}

export function StreamCustomPlayer({
  hlsUrl,
  title,
  posterUrl,
  initialTimeSeconds = 0,
  gameId,
}: StreamCustomPlayerProps) {
  return (
    <VideoPlayerCard
      videoSrc={hlsUrl}
      title={title}
      posterUrl={posterUrl}
      initialTimeSeconds={initialTimeSeconds}
      gameId={gameId}
    />
  );
}


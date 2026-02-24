'use client';

import { VideoPlayerCard } from '@/components/player/VideoPlayerCard';

interface StreamCustomPlayerProps {
  hlsUrl: string;
  title: string;
  /** Posição inicial em segundos (Continuar assistindo). */
  initialTimeSeconds?: number;
  /** Se informado, salva progresso periodicamente em /api/me/watch-progress. */
  gameId?: string;
}

export function StreamCustomPlayer({
  hlsUrl,
  title,
  initialTimeSeconds = 0,
  gameId,
}: StreamCustomPlayerProps) {
  return (
    <VideoPlayerCard
      videoSrc={hlsUrl}
      title={title}
      initialTimeSeconds={initialTimeSeconds}
      gameId={gameId}
    />
  );
}


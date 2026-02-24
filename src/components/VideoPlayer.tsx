'use client';

import { useEffect, useState } from 'react';
import { extractYouTubeVideoId, isYouTubeUrl } from '@/lib/youtube';
import { isStreamVideo, extractStreamVideoId } from '@/lib/cloudflare-stream';
import { StreamCustomPlayer } from './StreamCustomPlayer';
import { VideoPlayerCard } from '@/components/player/VideoPlayerCard';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  /** URL opcional de thumb/poster do vídeo. */
  posterUrl?: string;
  /** URL assinada iframe para Stream (fallback) */
  streamPlaybackUrl?: string;
  /** URL HLS assinada para player customizado (Video.js) */
  streamHlsUrl?: string;
  /** Contexto para buscar URL assinada no cliente (gameSlug, preSaleSlug, sessionToken para pré-estreia) */
  streamContext?: { gameSlug?: string; preSaleSlug?: string; sessionToken?: string };
  /** ID do jogo: habilita Continuar assistindo (seek inicial + salvar progresso) */
  gameId?: string;
}

export function VideoPlayer({
  videoUrl,
  title,
  posterUrl,
  streamPlaybackUrl,
  streamHlsUrl,
  streamContext,
  gameId,
}: VideoPlayerProps) {
  const [streamUrl, setStreamUrl] = useState<string | null>(streamPlaybackUrl ?? null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(streamHlsUrl ?? null);
  const [initialTimeSeconds, setInitialTimeSeconds] = useState(0);
  const isStream = isStreamVideo(videoUrl);
  const videoId = extractStreamVideoId(videoUrl);

  useEffect(() => {
    if (!gameId) return;
    fetch(`/api/me/watch-progress?gameId=${encodeURIComponent(gameId)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.positionSeconds === 'number' && d.positionSeconds > 0) {
          setInitialTimeSeconds(d.positionSeconds);
        }
      })
      .catch(() => {});
  }, [gameId]);

  useEffect(() => {
    if (!isStream || !videoId || (streamPlaybackUrl && streamHlsUrl)) return;
    if (streamContext?.gameSlug || streamContext?.preSaleSlug) {
      const params = new URLSearchParams({ videoId });
      if (streamContext.gameSlug) params.set('gameSlug', streamContext.gameSlug);
      if (streamContext.preSaleSlug) params.set('preSaleSlug', streamContext.preSaleSlug);
      if (streamContext.sessionToken) params.set('sessionToken', streamContext.sessionToken);
      fetch(`/api/video/stream-playback?${params}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => {
          if (d.playbackUrl) setStreamUrl(d.playbackUrl);
          if (d.hlsUrl) setHlsUrl(d.hlsUrl);
        })
        .catch(() => {});
    }
  }, [isStream, videoId, streamPlaybackUrl, streamHlsUrl, streamContext?.gameSlug, streamContext?.preSaleSlug, streamContext?.sessionToken]);

  const isYoutube = isYouTubeUrl(videoUrl);
  const isVimeo = /vimeo\.com/.test(videoUrl);
  const isPandaVideo = /pandavideo\.com\.br|pandavideo\.com/.test(videoUrl);

  if (isStream && (hlsUrl || streamHlsUrl)) {
    const hls = hlsUrl || streamHlsUrl || '';
    return (
      <StreamCustomPlayer
        hlsUrl={hls}
        title={title}
        posterUrl={posterUrl}
        initialTimeSeconds={initialTimeSeconds}
        gameId={gameId}
      />
    );
  }

  if (isStream && (streamUrl || streamPlaybackUrl)) {
    const embedSrc = streamUrl || streamPlaybackUrl || '';
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedSrc}
          title={title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  if (isStream && !streamUrl) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <p className="text-futvar-light">Carregando vídeo...</p>
      </div>
    );
  }

  if (isPandaVideo) {
    const embedUrl = videoUrl.includes('/embed/') ? videoUrl : videoUrl.replace(/\/$/, '');
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  if (isYoutube) {
    const videoId = extractYouTubeVideoId(videoUrl);
    const embedUrl = videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=0`
      : videoUrl;
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  if (isVimeo) {
    const id = videoUrl.split('vimeo.com/')[1]?.split('?')[0];
    const embedUrl = `https://player.vimeo.com/video/${id}`;
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <VideoPlayerCard
      videoSrc={videoUrl}
      title={title}
      posterUrl={posterUrl}
      initialTimeSeconds={initialTimeSeconds}
      gameId={gameId}
    />
  );
}

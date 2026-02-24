'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { PlayerControlsOverlay } from './PlayerControlsOverlay';
import { SettingsModal, QualityOption } from './SettingsModal';

const SAVE_PROGRESS_INTERVAL_MS = 30000;

interface VideoPlayerCardProps {
  videoSrc: string;
  title: string;
  /** Posição inicial em segundos (Continuar assistindo). */
  initialTimeSeconds?: number;
  /** Se informado, salva progresso periodicamente em /api/me/watch-progress. */
  gameId?: string;
}

type SettingsView = 'root' | 'speed' | 'quality';

export function VideoPlayerCard({
  videoSrc,
  title,
  initialTimeSeconds = 0,
  gameId,
}: VideoPlayerCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const saveIntervalRef = useRef<number | null>(null);
  const initialTimeRef = useRef(initialTimeSeconds);
  const gameIdRef = useRef(gameId);
  const mountedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedFraction, setBufferedFraction] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('root');
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([
    { id: 'auto', label: 'Automático', helper: undefined },
  ]);
  const [selectedQualityId, setSelectedQualityId] = useState('auto');

  initialTimeRef.current = initialTimeSeconds;
  gameIdRef.current = gameId;

  const isHlsSource = /\.m3u8($|\?)/i.test(videoSrc);

  const updateBuffered = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      setBufferedFraction(0);
      return;
    }
    const buffered = video.buffered;
    if (buffered.length === 0) {
      setBufferedFraction(0);
      return;
    }
    const end = buffered.end(buffered.length - 1);
    setBufferedFraction(Math.min(end / video.duration, 1));
  }, []);

  const saveProgress = useCallback(() => {
    const gid = gameIdRef.current;
    const video = videoRef.current;
    if (!gid || !video) return;
    const positionSeconds = Math.floor(video.currentTime || 0);
    const dur = video.duration;
    const durationSeconds =
      typeof dur === 'number' && Number.isFinite(dur) && dur > 0 ? Math.floor(dur) : undefined;

    fetch('/api/me/watch-progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        gameId: gid,
        positionSeconds,
        ...(durationSeconds !== undefined && { durationSeconds }),
      }),
    }).catch(() => {});
  }, []);

  // Inicialização do vídeo + HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    mountedRef.current = true;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const canPlayNativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== '';

    if (isHlsSource && !canPlayNativeHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.loadSource(videoSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels || [];
        if (levels.length) {
          const autoOption: QualityOption = { id: 'auto', label: 'Automático', helper: undefined };
          const mapped: QualityOption[] = levels.map((level, index) => {
            const height = level.height || 0;
            // Alguns builds de hls.js expõem frameRate, outros fps; usamos o que existir (via any para não travar o tipo).
            const anyLevel = level as unknown as { frameRate?: number; fps?: number };
            const rawFps = anyLevel.frameRate ?? anyLevel.fps ?? 0;
            const fps = Math.round(rawFps || 0);
            let label = height ? `${height}p` : `${index + 1}`;
            if (fps && fps >= 50) label = `${label}${fps}p`.replace('p60p', 'p60');
            let helper: string | undefined;
            if (height >= 1080) helper = 'HD';
            return {
              id: String(index),
              label,
              helper,
            };
          });
          setQualityOptions([autoOption, ...mapped]);
          setSelectedQualityId('auto');
        } else {
          setQualityOptions([{ id: 'auto', label: 'Automático', helper: undefined }]);
          setSelectedQualityId('auto');
        }
      });
    } else {
      video.src = videoSrc;
    }

    const onLoadedMetadata = () => {
      if (!mountedRef.current || !videoRef.current) return;
      const v = videoRef.current;
      setDuration(Number.isFinite(v.duration) ? v.duration : 0);
      const t = initialTimeRef.current;
      if (t > 0 && Number.isFinite(v.duration) && t < v.duration) {
        try {
          v.currentTime = t;
        } catch {
          // ignore
        }
      }
      setVolume(v.volume);
      setIsMuted(v.muted || v.volume === 0);
      updateBuffered();
    };

    const onTimeUpdate = () => {
      if (!mountedRef.current || !videoRef.current) return;
      const v = videoRef.current;
      setCurrentTime(v.currentTime || 0);
      if (Number.isFinite(v.duration)) {
        setDuration(v.duration);
      }
      updateBuffered();

      if (gameIdRef.current && saveIntervalRef.current === null) {
        saveProgress();
        saveIntervalRef.current = window.setInterval(saveProgress, SAVE_PROGRESS_INTERVAL_MS);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      saveProgress();
    };

    const onVolumeChange = () => {
      if (!videoRef.current) return;
      const v = videoRef.current;
      setVolume(v.volume);
      setIsMuted(v.muted || v.volume === 0);
    };

    const onRateChange = () => {
      if (!videoRef.current) return;
      setPlaybackRate(videoRef.current.playbackRate || 1);
    };

    const onProgress = () => {
      updateBuffered();
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ratechange', onRateChange);
    video.addEventListener('progress', onProgress);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgress();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mountedRef.current = false;
      if (saveIntervalRef.current !== null) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('ratechange', onRateChange);
      video.removeEventListener('progress', onProgress);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoSrc, isHlsSource, saveProgress, updateBuffered]);

  // Fullscreen helpers
  const handleToggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => Promise<void>;
      mozFullScreenElement?: Element | null;
      mozCancelFullScreen?: () => Promise<void>;
      msFullscreenElement?: Element | null;
      msExitFullscreen?: () => Promise<void>;
    };
    const isFs =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    if (isFs) {
      (doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen ||
        (() => Promise.resolve()))().catch(() => {});
      setIsFullscreen(false);
    } else {
      (container.requestFullscreen ||
        // @ts-expect-error webkit
        container.webkitRequestFullscreen ||
        // @ts-expect-error moz
        container.mozRequestFullScreen ||
        // @ts-expect-error ms
        container.msRequestFullscreen ||
        (() => Promise.resolve())
      )
        .call(container)
        .catch(() => {});
      setIsFullscreen(true);
    }
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleSkip = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const next = Math.min(Math.max(video.currentTime + deltaSeconds, 0), video.duration);
    video.currentTime = next;
  };

  const handleSeek = (fraction: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const target = video.duration * fraction;
    video.currentTime = target;
  };

  const handleVolumeChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.min(Math.max(value, 0), 1);
    video.volume = clamped;
    video.muted = clamped === 0;
    setVolume(clamped);
    setIsMuted(clamped === 0);
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted && video.volume > 0;
    if (nextMuted) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      if (video.volume === 0) {
        video.volume = 0.7;
        setVolume(0.7);
      }
      setIsMuted(false);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.min(Math.max(rate, 0.25), 3);
    video.playbackRate = clamped;
    setPlaybackRate(clamped);
  };

  const handleQualityChange = (id: string) => {
    setSelectedQualityId(id);
    const hls = hlsRef.current;
    if (!hls) return;
    if (id === 'auto') {
      hls.currentLevel = -1;
      return;
    }
    const index = Number(id);
    if (!Number.isNaN(index) && index >= 0 && index < hls.levels.length) {
      hls.currentLevel = index;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
      handlePlayPause();
    } else if (event.key === 'Escape') {
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleSkip(-10);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleSkip(10);
    }
  };

  // Sincronizar estado de fullscreen quando usuário usa tecla F11 ou botão do navegador
  useEffect(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };
    const onFsChange = () => {
      const isFs =
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement;
      setIsFullscreen(Boolean(isFs));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange as EventListener);
    document.addEventListener('mozfullscreenchange', onFsChange as EventListener);
    document.addEventListener('MSFullscreenChange', onFsChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange as EventListener);
      document.removeEventListener('mozfullscreenchange', onFsChange as EventListener);
      document.removeEventListener('MSFullscreenChange', onFsChange as EventListener);
    };
  }, []);

  return (
    <div className="flex justify-center px-4 sm:px-6">
      <div
        ref={containerRef}
        className="relative w-full max-w-[1100px] rounded-2xl bg-[#071617] border border-emerald-400/25 shadow-[0_18px_60px_rgba(0,0,0,0.9)] shadow-emerald-500/10 overflow-hidden"
      >
        {/* Vinheta leve no topo do card */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(42,252,152,0.18),_transparent_55%)]" />

        <div
          className="relative aspect-video bg-black"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label={title}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            preload="metadata"
            onContextMenu={(e) => e.preventDefault()}
          >
            Seu navegador não suporta vídeos.
          </video>

          <PlayerControlsOverlay
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            bufferedFraction={bufferedFraction}
            volume={volume}
            isMuted={isMuted}
            isFullscreen={isFullscreen}
            playbackRate={playbackRate}
            onTogglePlay={handlePlayPause}
            onSeek={handleSeek}
            onSkipBackward={() => handleSkip(-10)}
            onSkipForward={() => handleSkip(10)}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onToggleFullscreen={handleToggleFullscreen}
            onOpenSettings={() => {
              setSettingsView('root');
              setIsSettingsOpen(true);
            }}
          />
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          view={settingsView}
          onClose={() => setIsSettingsOpen(false)}
          onChangeView={setSettingsView}
          playbackRate={playbackRate}
          onPlaybackRateChange={handlePlaybackRateChange}
          qualityOptions={qualityOptions}
          selectedQualityId={selectedQualityId}
          onQualityChange={handleQualityChange}
        />
      </div>
    </div>
  );
}


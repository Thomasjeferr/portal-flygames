'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { PlayerControlsOverlay } from './PlayerControlsOverlay';
import { SettingsModal, QualityOption } from './SettingsModal';

const SAVE_PROGRESS_INTERVAL_MS = 30000;
const HIDE_CONTROLS_DELAY_MS = 3000;

interface VideoPlayerCardProps {
  videoSrc: string;
  title: string;
  /** Thumb inicial exibida antes do primeiro play. */
  posterUrl?: string;
  /** Posição inicial em segundos (Continuar assistindo). */
  initialTimeSeconds?: number;
  /** Se informado, salva progresso periodicamente em /api/me/watch-progress. */
  gameId?: string;
  /** Iniciar reprodução automaticamente quando o vídeo estiver pronto (ex.: live). */
  autoplay?: boolean;
}

type SettingsView = 'root' | 'speed' | 'quality';

export function VideoPlayerCard({
  videoSrc,
  title,
  posterUrl,
  initialTimeSeconds = 0,
  gameId,
  autoplay = false,
}: VideoPlayerCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const saveIntervalRef = useRef<number | null>(null);
  const initialTimeRef = useRef(initialTimeSeconds);
  const gameIdRef = useRef(gameId);
  const mountedRef = useRef(false);
  const appliedInitialSeekRef = useRef(false);
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const isSettingsOpenRef = useRef(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

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
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFakeFullscreen, setIsFakeFullscreen] = useState(false);

  initialTimeRef.current = initialTimeSeconds;
  gameIdRef.current = gameId;
  isPlayingRef.current = isPlaying;
  isSettingsOpenRef.current = isSettingsOpen;

  const isHlsSource = /\.m3u8($|\?)/i.test(videoSrc);

  const requestWakeLock = useCallback(() => {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const wakeLock = nav && 'wakeLock' in nav ? (nav as Navigator & { wakeLock: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock : null;
    if (!wakeLock) return;
    wakeLock.request('screen').then((sentinel) => {
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = sentinel;
    }).catch(() => {});
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

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
    appliedInitialSeekRef.current = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Usar hls.js sempre que suportado para ter seletor de qualidade (incluindo Safari)
    if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.loadSource(videoSrc);
      hls.attachMedia(video);

      const updateQualityFromLevels = () => {
        const levels = hls.levels || [];
        if (levels.length) {
          const autoOption: QualityOption = { id: 'auto', label: 'Automático', helper: undefined };
          const mapped: QualityOption[] = levels.map((level, index) => {
            const height = level.height || 0;
            const anyLevel = level as unknown as { frameRate?: number; fps?: number };
            const rawFps = anyLevel.frameRate ?? anyLevel.fps ?? 0;
            const fps = Math.round(rawFps || 0);
            let label = height ? `${height}p` : `${index + 1}`;
            if (fps && fps >= 50) label = `${label}${fps}p`.replace('p60p', 'p60');
            let helper: string | undefined;
            if (height >= 1080) helper = 'HD';
            return { id: String(index), label, helper };
          });
          setQualityOptions([autoOption, ...mapped]);
          setSelectedQualityId((prev) => {
            if (prev === 'auto') return 'auto';
            const idx = Number(prev);
            if (!Number.isNaN(idx) && idx >= 0 && idx < levels.length) return prev;
            return 'auto';
          });
        } else {
          setQualityOptions([{ id: 'auto', label: 'Automático', helper: undefined }]);
          setSelectedQualityId('auto');
        }
      };

      hls.on(Hls.Events.MANIFEST_PARSED, updateQualityFromLevels);
      hls.on(Hls.Events.LEVELS_UPDATED, updateQualityFromLevels);
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
          appliedInitialSeekRef.current = true;
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
      requestWakeLock();
    };
    const onPause = () => {
      setIsPlaying(false);
      releaseWakeLock();
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

    const tryAutoplay = () => {
      if (!mountedRef.current || !videoRef.current || !autoplay) return;
      const v = videoRef.current;
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (mountedRef.current) setIsPlaying(true);
        }).catch(() => {
          if (!mountedRef.current || !videoRef.current) return;
          const el = videoRef.current;
          el.muted = true;
          setIsMuted(true);
          el.play().then(() => {
            if (mountedRef.current) setIsPlaying(true);
          }).catch(() => {});
        });
      }
    };

    const onCanPlay = () => {
      if (!autoplay) return;
      video.removeEventListener('canplay', onCanPlay);
      tryAutoplay();
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ratechange', onRateChange);
    video.addEventListener('progress', onProgress);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        releaseWakeLock();
        saveProgress();
      } else if (document.visibilityState === 'visible' && videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    const onWebkitBeginFullscreen = () => {
      if (mountedRef.current) setIsFullscreen(true);
    };
    const onWebkitEndFullscreen = () => {
      if (mountedRef.current) setIsFullscreen(false);
    };
    video.addEventListener('webkitbeginfullscreen', onWebkitBeginFullscreen);
    video.addEventListener('webkitendfullscreen', onWebkitEndFullscreen);

    return () => {
      mountedRef.current = false;
      releaseWakeLock();
      video.removeEventListener('webkitbeginfullscreen', onWebkitBeginFullscreen);
      video.removeEventListener('webkitendfullscreen', onWebkitEndFullscreen);
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
      video.removeEventListener('canplay', onCanPlay);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoSrc, isHlsSource, autoplay, saveProgress, updateBuffered, requestWakeLock, releaseWakeLock]);

  // Aplicar "continuar assistindo" quando a API de progresso responder depois do vídeo já ter carregado
  useEffect(() => {
    if (initialTimeSeconds <= 0 || appliedInitialSeekRef.current) return;
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const t = Math.min(initialTimeSeconds, video.duration - 1);
    try {
      video.currentTime = t;
      appliedInitialSeekRef.current = true;
    } catch {
      // ignore
    }
  }, [initialTimeSeconds]);

  // Fullscreen: desktop usa container (ou fake CSS se não houver API); em mobile usa fullscreen nativo do vídeo (como antes)
  const handleToggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container && !video) return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => void | Promise<void>;
      mozFullScreenElement?: Element | null;
      mozCancelFullScreen?: () => void | Promise<void>;
      msFullscreenElement?: Element | null;
      msExitFullscreen?: () => void | Promise<void>;
    };

    const isFs =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      isFullscreen;

    const run = (p: void | Promise<void>) => {
      if (p && typeof (p as Promise<void>).catch === 'function') {
        (p as Promise<void>).catch(() => {});
      }
    };

    const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || window.innerWidth <= 768);

    try {
      if (isFs || isFakeFullscreen) {
        // Sair: native ou fake
        if (isFakeFullscreen) {
          setIsFakeFullscreen(false);
          setIsFullscreen(false);
        } else {
          const exitDoc =
            doc.exitFullscreen ||
            doc.webkitExitFullscreen ||
            doc.mozCancelFullScreen ||
            doc.msExitFullscreen;
          if (exitDoc) run(exitDoc.call(doc) as void | Promise<void>);
          const videoExit = video && (video as HTMLVideoElement & { webkitExitFullScreen?: () => void }).webkitExitFullScreen;
          if (videoExit) videoExit.call(video);
        }
      } else {
        const containerFs = container && (container as HTMLElement & {
          requestFullscreen?: () => void | Promise<void>;
          webkitRequestFullscreen?: () => void | Promise<void>;
          mozRequestFullScreen?: () => void | Promise<void>;
          msRequestFullscreen?: () => void | Promise<void>;
        });
        const requestContainer =
          containerFs?.requestFullscreen ||
          containerFs?.webkitRequestFullscreen ||
          containerFs?.mozRequestFullScreen ||
          containerFs?.msRequestFullscreen;

        if (isMobile) {
          // Mobile: fullscreen nativo do vídeo (comportamento anterior), sem overlay com nosso layout
          const videoFs = video && (
            (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen ||
            (video as HTMLVideoElement & { webkitEnterFullScreen?: () => void }).webkitEnterFullScreen ||
            (video as HTMLVideoElement & { requestFullscreen?: () => void }).requestFullscreen
          );
          if (videoFs) run(videoFs.call(video) as void | Promise<void>);
          else if (requestContainer) run(requestContainer.call(container) as void | Promise<void>);
        } else if (requestContainer) {
          run(requestContainer.call(container) as void | Promise<void>);
        } else {
          const videoFs = video && (
            (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen ||
            (video as HTMLVideoElement & { webkitEnterFullScreen?: () => void }).webkitEnterFullScreen ||
            (video as HTMLVideoElement & { requestFullscreen?: () => void }).requestFullscreen
          );
          if (videoFs) run(videoFs.call(video) as void | Promise<void>);
        }
      }
    } catch {
      // Em mobile não usamos fake fullscreen; em desktop fallback para fake
      if (!isMobile && !isFakeFullscreen) {
        setIsFakeFullscreen(true);
        setIsFullscreen(true);
      }
    }
  };

  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    hideControlsTimeoutRef.current = setTimeout(() => {
      hideControlsTimeoutRef.current = null;
      if (isPlayingRef.current && !isSettingsOpenRef.current) {
        setControlsVisible(false);
      }
    }, HIDE_CONTROLS_DELAY_MS);
  }, []);

  const showControlsAndScheduleHide = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
    scheduleHideControls();
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
      } else if (isFakeFullscreen) {
        setIsFakeFullscreen(false);
        setIsFullscreen(false);
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
      if (!isFs) setIsFakeFullscreen(false);
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

  // Limpar timeout ao desmontar e manter controles visíveis quando pausado
  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
        hideControlsTimeoutRef.current = null;
      }
    }
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
        hideControlsTimeoutRef.current = null;
      }
    };
  }, [isPlaying]);

  return (
    <div
      className={
        isFakeFullscreen
          ? 'fixed inset-0 z-[9999] bg-black flex items-center justify-center p-0'
          : 'flex justify-center w-full'
      }
    >
      <div
        ref={containerRef}
        className={`relative w-full max-w-[1100px] rounded-2xl bg-[#071617] border border-emerald-400/25 shadow-[0_18px_60px_rgba(0,0,0,0.9)] shadow-emerald-500/10 overflow-hidden ${isFakeFullscreen ? 'max-h-[100dvh] aspect-video h-auto w-full' : ''}`}
      >
        {/* Vinheta leve no topo do card */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(42,252,152,0.18),_transparent_55%)]" />

        <div
          className={`relative aspect-video bg-black ${!controlsVisible ? 'cursor-none' : ''}`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onMouseMove={showControlsAndScheduleHide}
          onMouseEnter={showControlsAndScheduleHide}
          onTouchStart={showControlsAndScheduleHide}
          aria-label={title}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            preload="metadata"
            poster={posterUrl}
            onClick={handlePlayPause}
            onContextMenu={(e) => e.preventDefault()}
          >
            Seu navegador não suporta vídeos.
          </video>

          {/* Botão de play central (quando pausado) - z-30 acima dos controles para garantir clique */}
          {!isPlaying && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePlayPause();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Reproduzir vídeo"
            >
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-black/70 border border-emerald-400/80 shadow-lg shadow-black/80 hover:bg-emerald-500/90 hover:border-emerald-300 transition-colors pointer-events-none">
                <svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-[1px] text-white pointer-events-none">
                  <path d="M8 5l11 7-11 7z" fill="currentColor" />
                </svg>
              </div>
            </div>
          )}

          <PlayerControlsOverlay
            show={controlsVisible}
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


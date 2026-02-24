'use client';

import React from 'react';
import { ProgressBar } from './ProgressBar';

interface PlayerControlsOverlayProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedFraction: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  playbackRate: number;
  onTogglePlay: () => void;
  onSeek: (fraction: number) => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onOpenSettings: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function PlayerControlsOverlay({
  isPlaying,
  currentTime,
  duration,
  bufferedFraction,
  volume,
  isMuted,
  isFullscreen,
  playbackRate,
  onTogglePlay,
  onSeek,
  onSkipBackward,
  onSkipForward,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onOpenSettings,
}: PlayerControlsOverlayProps) {
  const displayVolume = isMuted ? 0 : volume;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end">
      {/* Gradiente de fundo para legibilidade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 via-black/60 to-transparent" />

      <div className="pointer-events-auto relative px-4 pb-4 sm:px-5 sm:pb-5 space-y-3">
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          bufferedFraction={bufferedFraction}
          onSeek={onSeek}
        />

        <div className="flex items-center justify-between gap-3 text-white text-xs sm:text-sm">
          {/* Controles principais */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={onTogglePlay}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-emerald-500/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <rect x="6" y="5" width="4" height="14" fill="currentColor" />
                  <rect x="14" y="5" width="4" height="14" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-[1px]">
                  <path d="M8 5l11 7-11 7z" fill="currentColor" />
                </svg>
              )}
            </button>

            {/* Voltar 10s */}
            <button
              type="button"
              onClick={onSkipBackward}
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Voltar 10 segundos"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  d="M11 6V4L7.5 7.5 11 11V9c2.757 0 5 2.243 5 5 0 1.287-.488 2.457-1.286 3.338L16.7 18.7A5.972 5.972 0 0018 14c0-3.309-2.691-6-6-6z"
                  fill="currentColor"
                />
                <path d="M9 16h1v-3H9v3zm3 0v-1h-1v1h1zm0-3h-1v1h1v-1z" fill="currentColor" />
              </svg>
            </button>

            {/* Avançar 10s */}
            <button
              type="button"
              onClick={onSkipForward}
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Avançar 10 segundos"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  d="M13 6V4l3.5 3.5L13 11V9c-2.757 0-5 2.243-5 5 0 1.287.488 2.457 1.286 3.338L7.3 18.7A5.972 5.972 0 016 14c0-3.309 2.691-6 6-6z"
                  fill="currentColor"
                />
                <path d="M14 16v-3h-1v3h1zm-3 0h1v-1h-1v1zm0-3v1h1v-1h-1z" fill="currentColor" />
              </svg>
            </button>

            {/* Tempo */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] sm:text-xs text-white/80 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/40">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Lado direito: volume, velocidade, configurações, fullscreen */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            {/* Tempo em mobile */}
            <div className="flex sm:hidden items-center gap-1 text-[11px] text-white/80 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/40">/</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Velocidade atual (abre configurações) */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="hidden sm:inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/90 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Abrir configurações de reprodução"
            >
              {playbackRate.toFixed(2).replace('.00', '')}x
            </button>

            {/* Volume - oculto em mobile, mostra só mute */}
            <div className="hidden sm:flex items-center gap-2 min-w-[80px]">
              <button
                type="button"
                onClick={onToggleMute}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label={isMuted ? 'Ativar som' : 'Ativar mudo'}
              >
                {displayVolume === 0 ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      d="M5 9v6h4l5 4V5L9 9H5zm12.707 3l2.147-2.146-1.414-1.414L16.293 10.586 14.146 8.44l-1.414 1.414L14.879 12l-2.147 2.146 1.414 1.414 2.147-2.146 2.147 2.146 1.414-1.414L17.707 12z"
                      fill="currentColor"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor" />
                    <path
                      d="M16 8.82a4 4 0 010 6.36M16 5a7 7 0 010 14"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={displayVolume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="h-1 w-20 cursor-pointer accent-[#19d37a]"
                aria-label="Volume"
              />
            </div>

            {/* Mute simples no mobile */}
            <button
              type="button"
              onClick={onToggleMute}
              className="flex sm:hidden h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label={isMuted ? 'Ativar som' : 'Ativar mudo'}
            >
              {displayVolume === 0 ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M5 9v6h4l5 4V5L9 9H5zm12.707 3l2.147-2.146-1.414-1.414L16.293 10.586 14.146 8.44l-1.414 1.414L14.879 12l-2.147 2.146 1.414 1.414 2.147-2.146 2.147 2.146 1.414-1.414L17.707 12z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor" />
                  <path
                    d="M16 8.82a4 4 0 010 6.36M16 5a7 7 0 010 14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              )}
            </button>

            {/* Configurações */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Abrir configurações"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.61-.22l-2.39.96a7.025 7.025 0 00-1.63-.94l-.36-2.54A.5.5 0 0014.93 2h-3.86a.5.5 0 00-.49.42l-.36 2.54c-.6.23-1.15.54-1.63.94l-2.39-.96a.5.5 0 00-.61.22L1.77 9.02a.5.5 0 00.12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.48.4 1.03.72 1.63.94l.36 2.54c.04.24.25.42.49.42h3.86c.24 0 .45-.18.49-.42l.36-2.54c.6-.23 1.15-.54 1.63-.94l2.39.96c.26.11.55.02.69-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M9 9H5V5h4V3H3v6h6V9zm6 0h4v4h2V3h-6v2zM9 15H5v-4H3v6h6v-2zm6 0v2h6v-6h-2v4h-4z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M9 3H3v6h2V5h4V3zm6 0v2h4v4h2V3h-6zm4 16h-4v2h6v-6h-2v4zM5 15H3v6h6v-2H5v-4z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import React from 'react';

type SettingsView = 'root' | 'speed' | 'quality';

export interface QualityOption {
  id: string;
  label: string;
  helper?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  view: SettingsView;
  onClose: () => void;
  onChangeView: (view: SettingsView) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  qualityOptions: QualityOption[];
  selectedQualityId: string;
  onQualityChange: (id: string) => void;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 2, 3];

export function SettingsModal({
  isOpen,
  view,
  onClose,
  onChangeView,
  playbackRate,
  onPlaybackRateChange,
  qualityOptions,
  selectedQualityId,
  onQualityChange,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const renderHeader = (title: string, showBack: boolean) => (
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
      {showBack ? (
        <button
          type="button"
          onClick={() => onChangeView('root')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="Voltar"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
          </svg>
        </button>
      ) : (
        <div className="h-8 w-8" />
      )}
      <h3 className="flex-1 text-center text-sm font-semibold text-white">{title}</h3>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label="Fechar"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4">
          <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29 10.59 10.6 16.89 4.29z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );

  const renderRoot = () => (
    <div className="py-2">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-white hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M12 4a8 8 0 100 16 8 8 0 000-16zm1 4v4h3v2h-5V8h2z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div className="flex flex-col items-start">
            <span className="font-medium">Timer de suspensão</span>
            <span className="text-xs text-white/60">Pausar automaticamente após um tempo</span>
          </div>
        </div>
        <span className="text-xs text-white/60">Desat</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeView('speed')}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-white hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M12 4a8 8 0 100 16 8 8 0 000-16zm3.5 9.5-4-2.5v5l4-2.5z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div className="flex flex-col items-start">
            <span className="font-medium">Velocidade da reprodução</span>
            <span className="text-xs text-white/60">Controle fino de velocidade</span>
          </div>
        </div>
        <span className="text-xs text-white/60">
          {playbackRate === 1 ? 'Normal' : `${playbackRate.toFixed(2).replace('.00', '')}x`}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChangeView('quality')}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-white hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M5 5h14v14H5V5zm2 2v10h10V7H7z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div className="flex flex-col items-start">
            <span className="font-medium">Qualidade</span>
            <span className="text-xs text-white/60">Controle de resolução</span>
          </div>
        </div>
        <span className="text-xs text-white/60">
          {qualityOptions.find((q) => q.id === selectedQualityId)?.label ?? 'Automático'}
        </span>
      </button>
    </div>
  );

  const renderSpeed = () => (
    <div className="py-2 space-y-2">
      <div className="px-4">
        <div className="mb-4 flex items-center justify-between text-xs text-white/70">
          <span>1.00x</span>
          <span>{playbackRate.toFixed(2).replace('.00', '')}x</span>
          <span>3.00x</span>
        </div>
        <input
          type="range"
          min={SPEED_OPTIONS[0]}
          max={SPEED_OPTIONS[SPEED_OPTIONS.length - 1]}
          step={0.05}
          value={playbackRate}
          onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
          className="w-full accent-[#19d37a]"
          aria-label="Velocidade da reprodução"
        />
      </div>

      <div className="border-t border-white/10 pt-2">
        {SPEED_OPTIONS.map((rate) => {
          const isSelected = Math.abs(playbackRate - rate) < 0.01;
          return (
            <button
              key={rate}
              type="button"
              onClick={() => onPlaybackRateChange(rate)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/5"
            >
              <span className="font-medium">{rate.toFixed(2).replace('.00', '')}x</span>
              {isSelected && (
                <span className="text-[#19d37a] text-xs font-semibold">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderQuality = () => (
    <div className="py-2">
      {qualityOptions.map((q) => {
        const isSelected = q.id === selectedQualityId;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onQualityChange(q.id)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-white/5 text-left"
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">{q.label}</span>
              {q.helper && <span className="text-xs text-white/60">{q.helper}</span>}
            </div>
            {isSelected && (
              <span className="text-[#19d37a] text-xs font-semibold">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );

  const title =
    view === 'root'
      ? 'Configurações'
      : view === 'speed'
      ? 'Velocidade da reprodução'
      : 'Qualidade';

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-t-3xl bg-[#050a0a] text-white shadow-2xl sm:rounded-2xl sm:bg-[#050a0a]/95">
        {renderHeader(title, view !== 'root')}
        {view === 'root' && renderRoot()}
        {view === 'speed' && renderSpeed()}
        {view === 'quality' && renderQuality()}
      </div>
    </div>
  );
}


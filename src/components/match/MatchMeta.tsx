interface MatchMetaProps {
  title: string;
  dateLabel: string;
  isLive?: boolean;
  isReplay?: boolean;
}

export function MatchMeta({ title, dateLabel, isLive = false, isReplay = true }: MatchMetaProps) {
  return (
    <div className="mt-6 text-center">
      <div className="mb-3 flex items-center justify-center gap-3">
        {isLive && (
          <span className="inline-flex items-center rounded-full bg-[#e5243b] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow shadow-red-900/70">
            <span className="mr-1.5 h-2 w-2 rounded-full bg-white shadow-[0_0_0_3px_rgba(239,68,68,0.6)]" />
            Ao vivo
          </span>
        )}
        {isReplay && (
          <span className="inline-flex items-center rounded-full bg-[#19d37a] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#02130b] shadow shadow-emerald-900/70">
            Replay
          </span>
        )}
      </div>
      <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white mb-1">
        {title}
      </h1>
      <p className="text-sm text-emerald-100/80">{dateLabel}</p>
    </div>
  );
}


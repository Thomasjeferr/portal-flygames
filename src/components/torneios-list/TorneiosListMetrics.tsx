type TorneiosListMetricsProps = {
  totalTournaments: number;
  totalTeams: number;
  totalSlots: number;
};

export function TorneiosListMetrics({ totalTournaments, totalTeams, totalSlots }: TorneiosListMetricsProps) {
  const metrics = [
    {
      label: 'Campeonatos ativos',
      value: totalTournaments,
      icon: '🏆',
    },
    {
      label: 'Times inscritos',
      value: totalTeams,
      icon: '👥',
    },
    {
      label: 'Vagas totais',
      value: totalSlots,
      icon: '📋',
    },
    {
      label: 'Em andamento',
      value: totalTournaments,
      icon: '🔥',
    },
  ];

  return (
    <section className="px-4 lg:px-12 -mt-6 relative z-10">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-futvar-green/20 bg-futvar-dark/90 backdrop-blur-sm p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300"
            >
              <span className="text-2xl mb-2 block" aria-hidden>{m.icon}</span>
              <p className="text-2xl lg:text-3xl font-bold text-white tabular-nums">{m.value}</p>
              <p className="text-futvar-light text-sm font-medium mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

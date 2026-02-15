interface AdminKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

export function AdminKpiCard({ title, value, subtitle, icon }: AdminKpiCardProps) {
  return (
    <div className="bg-netflix-dark border border-white/10 rounded-lg p-5 hover:border-white/20 transition-colors">
      {icon && <span className="text-2xl mb-2 block">{icon}</span>}
      <p className="text-netflix-light text-sm">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {subtitle && <p className="text-xs text-netflix-light mt-1">{subtitle}</p>}
    </div>
  );
}

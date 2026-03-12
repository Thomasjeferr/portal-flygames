import Link from 'next/link';

interface Alert {
  type: string;
  title: string;
  message: string;
  href: string | null;
}

interface AdminAlertsProps {
  alerts: Alert[];
}

export function AdminAlerts({ alerts }: AdminAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 text-center text-gray-400">
        Nenhum alerta operacional
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((a, i) => (
        <div
          key={`${a.type}-${i}`}
          className="flex items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 transition-all duration-200 hover:border-amber-500/30 hover:shadow-lg"
        >
          <div>
            <p className="font-medium text-amber-200">{a.title}</p>
            <p className="text-sm text-gray-400 truncate max-w-md">{a.message}</p>
          </div>
          {a.href && (
            <Link
              href={a.href}
              className="px-3 py-1.5 rounded-lg bg-amber-600/30 text-amber-200 text-sm font-medium hover:bg-amber-600/50 whitespace-nowrap transition-colors duration-200"
            >
              Ver
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

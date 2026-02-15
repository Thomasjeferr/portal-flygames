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
      <div className="bg-netflix-dark border border-white/10 rounded-lg p-6 text-center text-netflix-light">
        Nenhum alerta operacional
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={`${a.type}-${i}`}
          className="flex items-center justify-between gap-4 p-4 rounded-lg bg-amber-900/20 border border-amber-500/30"
        >
          <div>
            <p className="font-medium text-amber-200">{a.title}</p>
            <p className="text-sm text-netflix-light truncate max-w-md">{a.message}</p>
          </div>
          {a.href && (
            <Link
              href={a.href}
              className="px-3 py-1.5 rounded bg-amber-600/30 text-amber-200 text-sm hover:bg-amber-600/50 whitespace-nowrap"
            >
              Ver
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

'use client';

import { ReactNode } from 'react';

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg?: string;
  growth?: string | null;
  accentColor?: 'emerald' | 'blue' | 'amber' | 'rose' | 'gray';
}

const accentStyles: Record<string, string> = {
  emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
  blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
  amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
  rose: 'from-rose-500/10 to-rose-600/5 border-rose-500/20',
  gray: 'from-gray-500/10 to-gray-600/5 border-gray-500/20',
};

const iconBgStyles: Record<string, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-400',
  blue: 'bg-blue-500/20 text-blue-400',
  amber: 'bg-amber-500/20 text-amber-400',
  rose: 'bg-rose-500/20 text-rose-400',
  gray: 'bg-gray-500/20 text-gray-400',
};

export function DashboardMetricCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  growth,
  accentColor = 'gray',
}: DashboardMetricCardProps) {
  const bgClass = iconBg ?? iconBgStyles[accentColor];
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${accentStyles[accentColor]} p-6 shadow-lg transition-all duration-200 ease-out hover:shadow-xl hover:border-opacity-50`}
      style={{ backgroundColor: '#111827' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
          {growth != null && growth !== '' && (
            <p className="mt-2 text-xs font-medium text-emerald-400">{growth}</p>
          )}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bgClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

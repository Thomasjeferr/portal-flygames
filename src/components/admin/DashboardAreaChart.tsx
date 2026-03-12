'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/** Converte YYYY-MM-DD para DD/MM (eixo). */
function formatDateShort(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m ? `${d}/${m}` : iso;
}

/** Converte YYYY-MM-DD para DD/MM/YYYY (tooltip). */
function formatDateFull(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

interface DashboardAreaChartProps {
  data: { date: string; value: number }[];
  title: string;
  valueKey?: string;
  color?: string;
  formatValue?: (v: number) => string;
  chartId?: string;
}

export function DashboardAreaChart({
  data,
  title,
  valueKey = 'value',
  color = '#10b981',
  formatValue = (v) => String(v),
  chartId = 'default',
}: DashboardAreaChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatDateShort(d.date),
  }));
  const gradientId = `gradient-${chartId}-${color.replace(/#/g, '')}`;

  return (
    <div
      className="rounded-2xl border border-white/10 p-6 shadow-lg transition-shadow duration-200 hover:shadow-xl"
      style={{ backgroundColor: '#111827' }}
    >
      <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>
      <div className="h-72">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            Sem dados ainda
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                fontSize={11}
                tick={{ fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tick={{ fill: '#9ca3af' }}
                tickFormatter={formatValue}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                }}
                labelStyle={{ color: '#d1d5db', fontWeight: 600 }}
                formatter={(value: number | undefined) => [value != null ? formatValue(value) : '', '']}
                labelFormatter={(_, payload) => {
                  const date = payload?.[0]?.payload?.date;
                  return `Data: ${date ? formatDateFull(date) : _}`;
                }}
              />
              <Area
                type="monotone"
                dataKey={valueKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: '#111827', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

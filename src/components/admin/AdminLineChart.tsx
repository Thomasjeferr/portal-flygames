'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AdminLineChartProps {
  data: { date: string; value: number }[];
  title: string;
  valueKey?: string;
  color?: string;
  formatValue?: (v: number) => string;
}

export function AdminLineChart({
  data,
  title,
  valueKey = 'value',
  color = '#e50914',
  formatValue = (v) => String(v),
}: AdminLineChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5) || d.date,
  }));

  return (
    <div className="bg-netflix-dark border border-white/10 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="h-64">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-netflix-light text-sm">
            Sem dados ainda
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="label"
                stroke="#999"
                fontSize={11}
                tick={{ fill: '#999' }}
              />
              <YAxis stroke="#999" fontSize={11} tick={{ fill: '#999' }} tickFormatter={formatValue} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number | undefined) => [value != null ? formatValue(value) : '', '']}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Line
                type="monotone"
                dataKey={valueKey}
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, r: 2 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

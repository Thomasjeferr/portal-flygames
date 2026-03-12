import { ReactNode } from 'react';

interface AdminTableProps<T> {
  columns: { key: keyof T | string; header: string; render?: (row: T) => ReactNode }[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
}

export function AdminTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Sem dados ainda',
}: AdminTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111827] p-8 text-center text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0B1120]/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-400"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-b border-white/5 transition-colors duration-200 hover:bg-white/5"
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-sm text-white">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key as string] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

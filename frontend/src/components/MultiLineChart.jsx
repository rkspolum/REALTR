import { useMemo, useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

function useIsDark() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m] = d.slice(0, 7).split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}

// datasets: [{ data: [], name: string, color: string }]
// dataKey: string — which field to pluck from each data row
export default function MultiLineChart({ datasets = [], dataKey, title, formatter }) {
  const isDark = useIsDark();

  const merged = useMemo(() => {
    if (!datasets.length) return [];
    const allDates = new Set(datasets.flatMap(d => (d.data || []).map(p => p.period_end)));
    const sortedDates = Array.from(allDates).sort();
    return sortedDates.map(date => {
      const point = { date };
      datasets.forEach((d, i) => {
        const found = (d.data || []).find(p => p.period_end === date);
        const val = found?.[dataKey];
        point[`v${i}`] = val != null ? val : null;
      });
      return point;
    });
  }, [datasets, dataKey]);

  const gridColor  = isDark ? '#374151' : '#e5e7eb';
  const tickColor  = isDark ? '#9ca3af' : '#6b7280';
  const tooltipBg  = isDark ? '#1f2937' : '#ffffff';
  const tooltipBorder = isDark ? '#374151' : '#e5e7eb';

  if (!datasets.length) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex items-center justify-center h-52">
        <p className="text-xs text-gray-400 dark:text-gray-500">No data</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={merged} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 10, fill: tickColor }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: tickColor }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatter}
            width={50}
          />
          <Tooltip
            formatter={(value, name) => {
              const idx = parseInt(name.replace('v', ''), 10);
              const label = datasets[idx]?.name || name;
              return [formatter ? formatter(value) : value, label];
            }}
            labelFormatter={fmtDate}
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', fontSize: 11 }}
            itemStyle={{ color: isDark ? '#e5e7eb' : '#111827' }}
          />
          {datasets.map((d, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={`v${i}`}
              stroke={d.color}
              dot={false}
              strokeWidth={1.8}
              connectNulls
              activeDot={{ r: 3, fill: d.color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

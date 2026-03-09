import { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
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

function fmtMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload, label, formatter, primaryName, compareName, compareColor, isDark }) {
  if (!active || !payload?.length) return null;
  const primary = payload.find(p => p.dataKey === 'value');
  const compare = payload.find(p => p.dataKey === 'compareValue');
  return (
    <div className={`border rounded-lg shadow-lg px-3 py-2 text-xs min-w-[120px] ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
      <p className={`mb-1.5 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{fmtMonth(label)}</p>
      {primary && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          {primaryName && <span className={`truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{primaryName}</span>}
          <span className={`font-semibold ml-auto pl-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatter(primary.value)}</span>
        </div>
      )}
      {compare && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: compareColor }} />
          {compareName && <span className={`truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{compareName}</span>}
          <span className="font-semibold ml-auto pl-2" style={{ color: compareColor }}>{formatter(compare.value)}</span>
        </div>
      )}
    </div>
  );
}

export default function TrendChart({
  data = [],
  dataKey,
  title,
  formatter = v => v,
  color = '#2563eb',
  compareData,
  compareName,
  compareColor = '#dc2626',
  primaryName,
}) {
  const isDark = useIsDark();

  const chartData = useMemo(() => {
    const map = new Map();
    data.forEach(d => {
      if (d[dataKey] != null) map.set(d.period_end, { date: d.period_end, value: d[dataKey] });
    });
    if (compareData?.length) {
      compareData.forEach(d => {
        if (d[dataKey] != null) {
          const existing = map.get(d.period_end) || { date: d.period_end };
          existing.compareValue = d[dataKey];
          map.set(d.period_end, existing);
        }
      });
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, compareData, dataKey]);

  const gridColor  = isDark ? '#374151' : '#f3f4f6';
  const tickColor  = isDark ? '#6b7280' : '#9ca3af';
  const cardBg     = isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100';
  const titleColor = isDark ? 'text-gray-400' : 'text-gray-500';

  if (chartData.length === 0) {
    return (
      <div className={`rounded-xl border p-4 flex flex-col ${cardBg}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-4 ${titleColor}`}>{title}</p>
        <div className={`flex-1 flex items-center justify-center text-xs italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          No history available — re-fetch data to see trends
        </div>
      </div>
    );
  }

  const allValues = chartData.flatMap(d => [d.value, d.compareValue].filter(v => v != null));
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const pad  = (maxV - minV) * 0.15 || Math.abs(minV * 0.1) || 1;

  return (
    <div className={`rounded-xl border p-4 flex flex-col ${cardBg}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${titleColor}`}>{title}</p>
      <div className="flex-1" style={{ minHeight: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtMonth}
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minV - pad, maxV + pad]}
              tickFormatter={v => formatter(v)}
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={formatter}
                  primaryName={primaryName}
                  compareName={compareName}
                  compareColor={compareColor}
                  isDark={isDark}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={chartData.length <= 6 ? { r: 3, fill: color, strokeWidth: 0 } : false}
              activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
            />
            {compareData?.length > 0 && (
              <Line
                type="monotone"
                dataKey="compareValue"
                stroke={compareColor}
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 4, fill: compareColor, strokeWidth: 0 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

function fmtMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{fmtMonth(label)}</p>
      <p className="font-semibold text-gray-900">{formatter(payload[0].value)}</p>
    </div>
  );
}

export default function TrendChart({ data = [], dataKey, title, formatter = v => v, color = '#2563eb' }) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</p>
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 italic">
          No history available — re-fetch data to see trends
        </div>
      </div>
    );
  }

  const chartData = data.map(d => ({ date: d.period_end, value: d[dataKey] })).filter(d => d.value != null);

  const values = chartData.map(d => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad  = (maxV - minV) * 0.15 || Math.abs(minV * 0.1) || 1;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
      <div className="flex-1" style={{ minHeight: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtMonth}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minV - pad, maxV + pad]}
              tickFormatter={v => formatter(v)}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip formatter={formatter} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={chartData.length <= 6 ? { r: 3, fill: color, strokeWidth: 0 } : false}
              activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

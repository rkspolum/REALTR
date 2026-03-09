import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Home, Clock, BarChart2 } from 'lucide-react';

const API = '/api';

function fmt(val, type) {
  if (val == null || isNaN(val)) return '—';
  if (type === 'price') return `$${Number(val).toLocaleString()}`;
  if (type === 'pct') return `${Number(val).toFixed(2)}%`;
  if (type === 'num') return Number(val).toLocaleString();
  if (type === 'days') return `${Number(val).toFixed(1)} days`;
  if (type === 'mos') return `${Number(val).toFixed(2)} mos`;
  return val;
}

function StatCard({ label, value, icon: Icon, trend, sub }) {
  const isPos = trend > 0;
  const isNeg = trend < 0;
  return (
    <div className="stat-card">
      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-xs">
        <Icon size={13} />
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</div>
      {trend != null && (
        <div className={`flex items-center gap-0.5 text-xs font-medium ${isPos ? 'text-green-600 dark:text-green-400' : isNeg ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
          {isPos ? <TrendingUp size={11} /> : isNeg ? <TrendingDown size={11} /> : null}
          {fmt(trend, 'pct')} YoY
        </div>
      )}
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500">{sub}</div>}
    </div>
  );
}

export default function SummaryBar({ filters }) {
  const params = new URLSearchParams();
  if (filters.region_type) params.set('region_type', filters.region_type);
  if (filters.property_type) params.set('property_type', filters.property_type);
  if (filters.state_codes) params.set('state_codes', filters.state_codes);

  const { data: s } = useQuery({
    queryKey: ['summary', filters.region_type, filters.property_type, filters.state_codes],
    queryFn: async () => {
      const res = await fetch(`${API}/summary?${params.toString()}`);
      return res.json();
    },
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 pb-0">
      <StatCard
        label="Markets"
        value={s ? Number(s.total_markets).toLocaleString() : '—'}
        icon={BarChart2}
        sub={s ? `Latest: ${s.latest_period?.slice(0, 10) || '—'}` : undefined}
      />
      <StatCard
        label="Avg Median Price"
        value={fmt(s?.avg_median_price, 'price')}
        icon={Home}
        trend={s?.avg_price_yoy_pct}
      />
      <StatCard
        label="Avg Days on Market"
        value={fmt(s?.avg_dom, 'days')}
        icon={Clock}
      />
      <StatCard
        label="Avg Months of Supply"
        value={fmt(s?.avg_mos, 'mos')}
        icon={BarChart2}
        sub="<3 = seller's market"
      />
      <StatCard
        label="Avg Sale-to-List"
        value={s?.avg_sale_to_list_pct ? `${Number(s.avg_sale_to_list_pct).toFixed(2)}%` : '—'}
        icon={TrendingUp}
      />
      <StatCard
        label="Price Change YoY"
        value={s?.avg_price_yoy_pct != null ? `${Number(s.avg_price_yoy_pct).toFixed(2)}%` : '—'}
        icon={TrendingUp}
        trend={s?.avg_price_yoy_pct}
      />
    </div>
  );
}

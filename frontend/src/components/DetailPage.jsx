import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import MarketTag from './MarketTag.jsx';
import TrendChart from './TrendChart.jsx';

const API = '/api';

function fmtPrice(v) {
  if (v == null) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(v).toLocaleString()}`;
}

function fmtPct(v, dec = 1) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(dec)}%`;
}

function fmtNum(v) { return v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }); }

const METRICS = [
  { label: 'Median Sale Price',   key: 'median_sale_price',     fmt: v => fmtPrice(v) },
  { label: 'List Price',          key: 'median_list_price',     fmt: v => fmtPrice(v) },
  { label: 'Price/SqFt',         key: 'median_ppsf',           fmt: v => v != null ? `$${Math.round(v)}` : '—' },
  { label: 'Price Change YoY',   key: 'median_sale_price_yoy', fmt: v => fmtPct(v) },
  { label: 'PPSF Change YoY',    key: 'median_ppsf_yoy',       fmt: v => fmtPct(v) },
  { label: 'Days on Market',     key: 'median_dom',            fmt: v => v != null ? `${Math.round(v)} days` : '—' },
  { label: 'Months of Supply',   key: 'months_of_supply',      fmt: v => v != null ? `${Number(v).toFixed(1)} mo` : '—' },
  { label: 'Homes Sold',         key: 'homes_sold',            fmt: fmtNum },
  { label: 'Homes Sold YoY',     key: 'homes_sold_yoy',        fmt: v => fmtPct(v) },
  { label: 'New Listings',       key: 'new_listings',          fmt: fmtNum },
  { label: 'New Listings YoY',   key: 'new_listings_yoy',      fmt: v => fmtPct(v) },
  { label: 'Inventory',          key: 'inventory',             fmt: fmtNum },
  { label: 'Inventory YoY',      key: 'inventory_yoy',         fmt: v => fmtPct(v) },
  { label: 'Sale-to-List',       key: 'avg_sale_to_list',      fmt: v => v != null ? `${(v * 100).toFixed(1)}%` : '—' },
  { label: 'Sold Above List',    key: 'sold_above_list',       fmt: v => fmtPct(v, 0) },
  { label: 'Price Drops',        key: 'price_drops',           fmt: v => fmtPct(v, 0) },
  { label: 'Off Mkt <2 Weeks',   key: 'off_market_in_two_weeks', fmt: v => fmtPct(v, 0) },
  { label: 'Data Period',        key: 'period_end',            fmt: v => v?.slice(0, 10) || '—' },
];

function MetricCard({ label, value, highlight }) {
  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-1 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className={`text-base font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

const CHARTS = [
  { title: 'Median Sale Price',  dataKey: 'median_sale_price',  color: '#2563eb', fmt: v => `$${Math.round(v/1000)}K` },
  { title: 'Inventory',          dataKey: 'inventory',           color: '#7c3aed', fmt: v => Math.round(v).toLocaleString() },
  { title: 'Days on Market',     dataKey: 'median_dom',          color: '#d97706', fmt: v => `${Math.round(v)}d` },
  { title: 'Months of Supply',   dataKey: 'months_of_supply',    color: '#059669', fmt: v => `${Number(v).toFixed(1)} mo` },
];

export default function DetailPage({ market, onBack }) {
  const { data: history = [] } = useQuery({
    queryKey: ['history', market.region_type, market.region, market.state_code, market.property_type],
    queryFn: async () => {
      const p = new URLSearchParams({
        region_type:   market.region_type,
        region:        market.region,
        state_code:    market.state_code || '',
        property_type: market.property_type || 'All Residential',
      });
      const res = await fetch(`${API}/history?${p}`);
      return res.json();
    },
  });

  const highlightKeys = new Set(['median_sale_price', 'months_of_supply', 'median_dom', 'avg_sale_to_list']);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Back bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Screener
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{market.region}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500 capitalize">{market.region_type}</span>
              {market.state_code && <span className="text-sm text-gray-400">· {market.state_code}</span>}
              {market.property_type && <span className="text-sm text-gray-400">· {market.property_type}</span>}
            </div>
          </div>
          <MarketTag mos={market.months_of_supply} size="lg" />
        </div>

        {/* Metrics grid */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Current Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {METRICS.map(m => (
              <MetricCard
                key={m.key}
                label={m.label}
                value={m.fmt(market[m.key])}
                highlight={highlightKeys.has(m.key)}
              />
            ))}
          </div>
        </div>

        {/* Trend charts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">12-Month Trends</h2>
            {history.length > 0 && (
              <span className="text-xs text-gray-400">{history.length} months of data</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ height: 380 }}>
            {CHARTS.map(c => (
              <TrendChart
                key={c.dataKey}
                data={history}
                dataKey={c.dataKey}
                title={c.title}
                formatter={c.fmt}
                color={c.color}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

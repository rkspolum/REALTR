import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Search, X, Plus } from 'lucide-react';
import { marketKey } from './Watchlist.jsx';
import MultiLineChart from './MultiLineChart.jsx';
import MarketTag from './MarketTag.jsx';

const API = '/api';

const COMPARE_COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706'];

const REGION_TYPES = [
  { value: 'metro',   label: 'Metro' },
  { value: 'county',  label: 'County' },
  { value: 'city',    label: 'City' },
  { value: 'zip',     label: 'ZIP' },
  { value: 'state',   label: 'State' },
];

const COMPARE_METRICS = [
  { label: 'Median Sale Price',   key: 'median_sale_price',       fmt: v => v == null ? '—' : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : `$${Math.round(v/1000)}K` },
  { label: 'List Price',          key: 'median_list_price',       fmt: v => v == null ? '—' : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : `$${Math.round(v/1000)}K` },
  { label: 'Price/SqFt',         key: 'median_ppsf',             fmt: v => v != null ? `$${Math.round(v)}` : '—' },
  { label: 'Price Change YoY',   key: 'median_sale_price_yoy',   fmt: v => v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%` },
  { label: 'Days on Market',     key: 'median_dom',              fmt: v => v != null ? `${Math.round(v)} days` : '—' },
  { label: 'Months of Supply',   key: 'months_of_supply',        fmt: v => v != null ? `${Number(v).toFixed(1)} mo` : '—' },
  { label: 'Homes Sold',         key: 'homes_sold',              fmt: v => v == null ? '—' : Number(v).toLocaleString() },
  { label: 'New Listings',       key: 'new_listings',            fmt: v => v == null ? '—' : Number(v).toLocaleString() },
  { label: 'Inventory',          key: 'inventory',               fmt: v => v == null ? '—' : Number(v).toLocaleString() },
  { label: 'Sale-to-List',       key: 'avg_sale_to_list',        fmt: v => v != null ? `${(v * 100).toFixed(1)}%` : '—' },
  { label: '% Sold Above List',  key: 'sold_above_list',         fmt: v => v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%` },
  { label: '% Price Drop',       key: 'price_drops',             fmt: v => v == null ? '—' : `${(v * 100).toFixed(0)}%` },
];

const COMPARE_CHARTS = [
  { title: 'Median Sale Price',  dataKey: 'median_sale_price',     fmt: v => `$${Math.round(v/1000)}K` },
  { title: 'Days on Market',     dataKey: 'median_dom',            fmt: v => `${Math.round(v)}d` },
  { title: 'Months of Supply',   dataKey: 'months_of_supply',      fmt: v => `${Number(v).toFixed(1)} mo` },
  { title: 'Price Change YoY',   dataKey: 'median_sale_price_yoy', fmt: v => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%` },
  { title: 'Inventory',          dataKey: 'inventory',             fmt: v => Math.round(v).toLocaleString() },
  { title: 'New Listings',       dataKey: 'new_listings',          fmt: v => Math.round(v).toLocaleString() },
];

function AddMarketSearch({ onAdd, existingMarkets, disabled }) {
  const [regionType, setRegionType] = useState('metro');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data } = useQuery({
    queryKey: ['compare-add-search', regionType, query],
    queryFn: async () => {
      if (query.length < 2) return { rows: [] };
      const p = new URLSearchParams({
        region_type: regionType,
        region_search: query,
        limit: 8,
        property_type: 'All Residential',
      });
      return (await fetch(`${API}/market-data?${p}`)).json();
    },
    enabled: query.length >= 2,
  });

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const existingKeys = new Set(existingMarkets.map(m => marketKey(m)));
  const results = (data?.rows || []).filter(m => !existingKeys.has(marketKey(m)));

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <select
          value={regionType}
          onChange={e => setRegionType(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
        >
          {REGION_TYPES.map(rt => (
            <option key={rt.value} value={rt.value}>{rt.label}</option>
          ))}
        </select>

        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={disabled ? 'Maximum 4 markets reached' : `Search ${regionType}s…`}
            disabled={disabled}
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
        </div>
      </div>

      {open && results.length > 0 && !disabled && (
        <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 w-80 max-h-60 overflow-y-auto">
          {results.map((m, i) => (
            <button
              key={i}
              onClick={() => { onAdd(m); setQuery(''); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between gap-3 border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.region}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{m.state_code} · {m.region_type}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <MarketTag mos={m.months_of_supply} />
                <Plus size={13} className="text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompareTab() {
  const [markets, setMarkets] = useState([]);

  function addMarket(m) {
    if (markets.length >= 4) return;
    const key = marketKey(m);
    if (markets.some(em => marketKey(em) === key)) return;
    setMarkets(prev => [...prev, m]);
  }

  function removeMarket(m) {
    setMarkets(prev => prev.filter(em => marketKey(em) !== marketKey(m)));
  }

  const historyResults = useQueries({
    queries: markets.map(m => ({
      queryKey: ['compare-history', m.region_type, m.region, m.state_code, m.property_type],
      queryFn: async () => {
        const p = new URLSearchParams({
          region_type:   m.region_type,
          region:        m.region,
          state_code:    m.state_code || '',
          property_type: m.property_type || 'All Residential',
        });
        const res = await fetch(`${API}/history?${p}`);
        return res.json();
      },
    })),
  });

  const chartDatasets = markets.map((m, i) => ({
    name: m.region,
    color: COMPARE_COLORS[i],
    data: historyResults[i]?.data || [],
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Market Comparison</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add up to 4 markets to compare side-by-side.</p>
      </div>

      {/* Add market */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Add Market</p>
        <AddMarketSearch onAdd={addMarket} existingMarkets={markets} disabled={markets.length >= 4} />

        {/* Market chips */}
        {markets.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {markets.map((m, i) => (
              <div
                key={marketKey(m)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: COMPARE_COLORS[i] }}
              >
                <span className="max-w-[160px] truncate">{m.region}</span>
                <span className="opacity-70 text-xs">{m.state_code}</span>
                <button
                  onClick={() => removeMarket(m)}
                  className="opacity-80 hover:opacity-100 transition-opacity ml-1"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {markets.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No markets added yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Search above to add markets to compare.</p>
        </div>
      )}

      {/* Metrics table */}
      {markets.length >= 1 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Metrics</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 w-40">Metric</th>
                  {markets.map((m, i) => (
                    <th key={marketKey(m)} className="text-left px-4 py-2.5 text-xs font-semibold min-w-[130px]" style={{ color: COMPARE_COLORS[i] }}>
                      <div className="truncate max-w-[160px]">{m.region}</div>
                      <div className="text-gray-400 dark:text-gray-500 font-normal">{m.state_code} · {m.region_type}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_METRICS.map(({ label, key, fmt }, rowIdx) => (
                  <tr
                    key={key}
                    className={`border-b border-gray-50 dark:border-gray-800 last:border-0 ${rowIdx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'}`}
                  >
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</td>
                    {markets.map(m => (
                      <td key={marketKey(m)} className="px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {fmt(m[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trend charts */}
      {markets.length >= 1 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Historical Trends</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {COMPARE_CHARTS.map(chart => (
              <MultiLineChart
                key={chart.dataKey}
                datasets={chartDatasets}
                dataKey={chart.dataKey}
                title={chart.title}
                formatter={chart.fmt}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

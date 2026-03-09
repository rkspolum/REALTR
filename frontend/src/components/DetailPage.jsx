import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, ArrowLeftRight, X, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import MarketTag from './MarketTag.jsx';
import TrendChart from './TrendChart.jsx';
import InfoTip from './InfoTip.jsx';

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
  { label: 'Median Sale Price',   key: 'median_sale_price',       fmt: v => fmtPrice(v),                                 tip: 'Midpoint sale price — half of homes sold for more, half for less.' },
  { label: 'List Price',          key: 'median_list_price',       fmt: v => fmtPrice(v),                                 tip: 'Median asking price. Compare to Median Sale Price to gauge whether homes close above or below asking.' },
  { label: 'Price/SqFt',         key: 'median_ppsf',             fmt: v => v != null ? `$${Math.round(v)}` : '—',       tip: 'Median price per square foot. Useful for comparing value across markets with different average home sizes.' },
  { label: 'Price Change YoY',   key: 'median_sale_price_yoy',   fmt: v => fmtPct(v),                                   tip: 'Year-over-year % change in median sale price. Positive = appreciation, negative = depreciation.' },
  { label: 'PPSF Change YoY',    key: 'median_ppsf_yoy',         fmt: v => fmtPct(v),                                   tip: 'Year-over-year % change in price per square foot — a size-normalized view of price trends.' },
  { label: 'Days on Market',     key: 'median_dom',              fmt: v => v != null ? `${Math.round(v)} days` : '—',   tip: 'Median days from listing to accepted offer. Under 20 = hot market. Over 60 = buyer has leverage.' },
  { label: 'Months of Supply',   key: 'months_of_supply',        fmt: v => v != null ? `${Number(v).toFixed(1)} mo` : '—', tip: "Months to sell all current inventory at today's sales pace. Under 3 = seller's market. Over 6 = buyer's market." },
  { label: 'Homes Sold',         key: 'homes_sold',              fmt: fmtNum,                                            tip: 'Total homes sold in the most recent data period. Low volume can signal an illiquid or slow market.' },
  { label: 'Homes Sold YoY',     key: 'homes_sold_yoy',          fmt: v => fmtPct(v),                                   tip: 'Year-over-year % change in homes sold. Declining sales volume can precede price changes.' },
  { label: 'New Listings',       key: 'new_listings',            fmt: fmtNum,                                            tip: 'New listings added in the most recent period. Rising supply can signal increasing seller confidence or market cooling.' },
  { label: 'New Listings YoY',   key: 'new_listings_yoy',        fmt: v => fmtPct(v),                                   tip: 'Year-over-year % change in new listings. Rising new supply tends to soften price growth.' },
  { label: 'Inventory',          key: 'inventory',               fmt: fmtNum,                                            tip: 'Total active listings at end of period. Low inventory drives competition; high inventory gives buyers more options.' },
  { label: 'Inventory YoY',      key: 'inventory_yoy',           fmt: v => fmtPct(v),                                   tip: 'Year-over-year % change in inventory. Rising inventory tends to cool price growth over time.' },
  { label: 'Sale-to-List',       key: 'avg_sale_to_list',        fmt: v => v != null ? `${(v * 100).toFixed(1)}%` : '—', tip: 'Average sale price ÷ list price. Over 100% = homes closing above asking, a sign of bidding wars.' },
  { label: 'Sold Above List',    key: 'sold_above_list',         fmt: v => fmtPct(v, 0),                                tip: '% of homes that sold above asking price. High % = highly competitive, supply-constrained market.' },
  { label: 'Price Drops',        key: 'price_drops',             fmt: v => fmtPct(v, 0),                                tip: '% of active listings with at least one price reduction — signals overpriced listings or softening demand.' },
  { label: 'Off Mkt <2 Weeks',   key: 'off_market_in_two_weeks', fmt: v => fmtPct(v, 0),                                tip: '% of homes that went off market within 2 weeks of listing — a strong signal of demand intensity.' },
  { label: 'Data Period',        key: 'period_end',              fmt: v => v?.slice(0, 10) || '—',                      tip: 'The month/year of the most recent data available for this market from Redfin.' },
];

function MetricCard({ label, value, highlight, tip }) {
  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-1
      ${highlight
        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700'}`}>
      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium flex items-center">
        {label}{tip && <InfoTip text={tip} />}
      </span>
      <span className={`text-base font-bold ${highlight ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>{value}</span>
    </div>
  );
}

const CHARTS = [
  { title: 'Median Sale Price',  dataKey: 'median_sale_price',     color: '#2563eb', fmt: v => `$${Math.round(v/1000)}K` },
  { title: 'Days on Market',     dataKey: 'median_dom',            color: '#d97706', fmt: v => `${Math.round(v)}d` },
  { title: 'Months of Supply',   dataKey: 'months_of_supply',      color: '#059669', fmt: v => `${Number(v).toFixed(1)} mo` },
  { title: 'Inventory',          dataKey: 'inventory',             color: '#7c3aed', fmt: v => Math.round(v).toLocaleString() },
  { title: 'New Listings',       dataKey: 'new_listings',          color: '#0891b2', fmt: v => Math.round(v).toLocaleString() },
  { title: 'Homes Sold',         dataKey: 'homes_sold',            color: '#65a30d', fmt: v => Math.round(v).toLocaleString() },
  { title: 'Sale-to-List Ratio', dataKey: 'avg_sale_to_list',      color: '#9333ea', fmt: v => `${(v * 100).toFixed(1)}%` },
  { title: 'Price Change YoY',   dataKey: 'median_sale_price_yoy', color: '#e11d48', fmt: v => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%` },
];

function CompareSearch({ regionType, onSelect, onClear, selected }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data } = useQuery({
    queryKey: ['compare-search', query, regionType],
    queryFn: async () => {
      if (query.length < 2) return { rows: [] };
      const params = new URLSearchParams({
        region_type: regionType,
        region_search: query,
        limit: 10,
        property_type: 'All Residential',
      });
      const res = await fetch(`${API}/market-data?${params}`);
      return res.json();
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

  if (selected) {
    return (
      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5">
        <ArrowLeftRight size={14} className="text-red-500 dark:text-red-400 flex-shrink-0" />
        <span className="text-sm font-medium text-red-700 dark:text-red-300 truncate max-w-[160px]">vs {selected.region}</span>
        <button onClick={onClear} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    );
  }

  const results = data?.rows || [];

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <Search size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Compare with another market…"
          className="text-sm outline-none w-48 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 w-72 max-h-52 overflow-y-auto">
          {results.map((m, i) => (
            <button
              key={i}
              onClick={() => { onSelect(m); setQuery(''); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.region}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{m.state_code} · {m.region_type}</p>
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">
                {m.median_sale_price >= 1e6 ? `$${(m.median_sale_price/1e6).toFixed(1)}M` : `$${Math.round(m.median_sale_price/1000)}K`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DetailPage({ market, onBack, isWatched, onWatchlistToggle }) {
  const [compareMarket, setCompareMarket] = useState(null);

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

  const { data: compareHistory = [] } = useQuery({
    queryKey: ['history', compareMarket?.region_type, compareMarket?.region, compareMarket?.state_code, compareMarket?.property_type],
    queryFn: async () => {
      if (!compareMarket) return [];
      const p = new URLSearchParams({
        region_type:   compareMarket.region_type,
        region:        compareMarket.region,
        state_code:    compareMarket.state_code || '',
        property_type: compareMarket.property_type || 'All Residential',
      });
      const res = await fetch(`${API}/history?${p}`);
      return res.json();
    },
    enabled: !!compareMarket,
  });

  const watched = isWatched?.(market);
  const highlightKeys = new Set(['median_sale_price', 'months_of_supply', 'median_dom', 'avg_sale_to_list']);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
      {/* Back bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Screener
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{market.region}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{market.region_type}</span>
              {market.state_code && <span className="text-sm text-gray-400 dark:text-gray-500">· {market.state_code}</span>}
              {market.property_type && <span className="text-sm text-gray-400 dark:text-gray-500">· {market.property_type}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onWatchlistToggle?.(market)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors
                ${watched
                  ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-950/60'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-yellow-400 dark:hover:border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 hover:text-yellow-700 dark:hover:text-yellow-400'}`}
            >
              <Star size={14} className={watched ? 'fill-yellow-500 text-yellow-500' : ''} />
              {watched ? 'Saved' : 'Save'}
            </button>
            <MarketTag mos={market.months_of_supply} size="lg" />
          </div>
        </div>

        {/* Metrics grid */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Current Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {METRICS.map(m => (
              <MetricCard
                key={m.key}
                label={m.label}
                value={m.fmt(market[m.key])}
                highlight={highlightKeys.has(m.key)}
                tip={m.tip}
              />
            ))}
          </div>
        </div>

        {/* Trend charts */}
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Historical Trends</h2>
              {history.length > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{history.length} months of data</span>
              )}
            </div>
            <CompareSearch
              regionType={market.region_type}
              onSelect={setCompareMarket}
              onClear={() => setCompareMarket(null)}
              selected={compareMarket}
            />
          </div>

          {compareMarket && (
            <div className="flex items-center gap-4 mb-3 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-600 inline-block rounded" />
                <span className="font-medium text-gray-700 dark:text-gray-300">{market.region}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="14" height="4"><line x1="0" y1="2" x2="14" y2="2" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 2"/></svg>
                <span className="font-medium text-red-600 dark:text-red-400">{compareMarket.region}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CHARTS.map(c => (
              <TrendChart
                key={c.dataKey}
                data={history}
                dataKey={c.dataKey}
                title={c.title}
                formatter={c.fmt}
                color={c.color}
                primaryName={market.region}
                compareData={compareMarket ? compareHistory : undefined}
                compareName={compareMarket?.region}
                compareColor="#dc2626"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, DollarSign, Zap, ArrowUpRight, Tag, ChevronRight } from 'lucide-react';
import MarketTag from './MarketTag.jsx';

const API = '/api';

function fmtPrice(v) {
  if (v == null) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(v / 1000)}K`;
}

function fmtMos(v) {
  if (v == null) return '—';
  return `${Number(v).toFixed(1)} mo`;
}

function fmtStl(v) {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function fmtPct(v) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`;
}

function MarketCard({ market, metricLabel, metricValue, onClick }) {
  return (
    <button
      onClick={() => onClick(market)}
      className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/70 rounded-lg transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{market.region}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">{market.state_code}</span>
          <MarketTag mos={market.months_of_supply} />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{metricValue}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{metricLabel}</p>
      </div>
      <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 flex-shrink-0" />
    </button>
  );
}

function DashSection({ title, subtitle, icon: Icon, iconColor, markets = [], metricLabel, metricFn, onMarketClick, loading }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon size={14} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800" style={{ maxHeight: 360 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-3 py-2.5 animate-pulse flex gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12" />
            </div>
          ))
        ) : markets.length === 0 ? (
          <div className="px-4 py-6 text-xs text-gray-400 dark:text-gray-500 text-center italic">
            Fetch data first to see results
          </div>
        ) : (
          markets.map((m, i) => (
            <MarketCard
              key={i}
              market={m}
              metricLabel={metricLabel}
              metricValue={metricFn(m)}
              onClick={onMarketClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ regionType = 'metro', stateCodes = '', propertyType = '', onMarketClick }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', regionType, stateCodes, propertyType],
    queryFn: async () => {
      const params = new URLSearchParams({ region_type: regionType });
      if (stateCodes) params.set('state_codes', stateCodes);
      if (propertyType) params.set('property_type', propertyType);
      const res = await fetch(`${API}/dashboard?${params}`);
      return res.json();
    },
  });

  const sections = [
    {
      title: "Top Buyer's Markets",
      subtitle: 'Highest months of supply',
      icon: TrendingDown,
      iconColor: 'bg-blue-500',
      markets: data?.buyersMarkets,
      metricLabel: 'Mos. Supply',
      metricFn: m => fmtMos(m.months_of_supply),
    },
    {
      title: "Top Seller's Markets",
      subtitle: 'Lowest months of supply',
      icon: TrendingUp,
      iconColor: 'bg-orange-500',
      markets: data?.sellersMarkets,
      metricLabel: 'Mos. Supply',
      metricFn: m => fmtMos(m.months_of_supply),
    },
    {
      title: 'Most Affordable',
      subtitle: 'Median price under $250K',
      icon: DollarSign,
      iconColor: 'bg-green-500',
      markets: data?.affordable,
      metricLabel: 'Median Price',
      metricFn: m => fmtPrice(m.median_sale_price),
    },
    {
      title: 'Fastest Appreciating',
      subtitle: 'Highest sale-to-list ratio',
      icon: Zap,
      iconColor: 'bg-purple-500',
      markets: data?.appreciating,
      metricLabel: 'Sale/List',
      metricFn: m => fmtStl(m.avg_sale_to_list),
    },
    {
      title: 'Rising Inventory',
      subtitle: 'Highest inventory growth YoY',
      icon: ArrowUpRight,
      iconColor: 'bg-cyan-500',
      markets: data?.risingInventory,
      metricLabel: 'Inv. YoY',
      metricFn: m => fmtPct(m.inventory_yoy),
    },
    {
      title: 'Most Price Cuts',
      subtitle: '% of listings with reductions',
      icon: Tag,
      iconColor: 'bg-red-500',
      markets: data?.mostPriceDrops,
      metricLabel: '% Cut',
      metricFn: m => m.price_drops != null ? `${(m.price_drops * 100).toFixed(0)}%` : '—',
    },
  ];

  return (
    <div className="px-4 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map(s => (
          <DashSection
            key={s.title}
            {...s}
            loading={isLoading}
            onMarketClick={onMarketClick}
          />
        ))}
      </div>
    </div>
  );
}

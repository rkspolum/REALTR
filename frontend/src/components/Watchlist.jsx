import { useState } from 'react';
import { Star, X, ChevronRight, Trash2 } from 'lucide-react';
import MarketTag from './MarketTag.jsx';

const WATCHLIST_KEY = 'redfin_watchlist';

export function marketKey(m) {
  return `${m.region_type}:${m.region}:${m.state_code || ''}:${m.property_type || ''}`;
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || []; }
    catch { return []; }
  });

  function isWatched(market) {
    const k = marketKey(market);
    return watchlist.some(m => marketKey(m) === k);
  }

  function toggle(market) {
    setWatchlist(prev => {
      const k = marketKey(market);
      const next = prev.some(m => marketKey(m) === k)
        ? prev.filter(m => marketKey(m) !== k)
        : [...prev, { ...market }];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  }

  function clear() {
    setWatchlist([]);
    localStorage.removeItem(WATCHLIST_KEY);
  }

  return { watchlist, isWatched, toggle, clear };
}

function fmtPrice(v) {
  if (v == null) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(v / 1000)}K`;
}

export function WatchlistPanel({ watchlist, onMarketClick, onToggle, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <Star size={18} className="text-yellow-500 fill-yellow-400" />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Watchlist</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">{watchlist.length} saved market{watchlist.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {watchlist.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Star size={32} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No markets saved yet.</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Click the ★ on any row to add it.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {watchlist.map((m, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <button
                    className="flex-1 flex items-center gap-3 min-w-0 text-left"
                    onClick={() => { onMarketClick(m); }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.region}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{m.state_code}</span>
                        <MarketTag mos={m.months_of_supply} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtPrice(m.median_sale_price)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{m.region_type}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 flex-shrink-0" />
                  </button>
                  <button
                    onClick={() => onToggle(m)}
                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remove from watchlist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WatchlistFAB({ count, onClick }) {
  if (count === 0) return null;
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl rounded-full px-4 py-2.5 transition-shadow"
    >
      <Star size={15} className="text-yellow-500 fill-yellow-400" />
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Watchlist</span>
      <span className="bg-yellow-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
        {count}
      </span>
    </button>
  );
}

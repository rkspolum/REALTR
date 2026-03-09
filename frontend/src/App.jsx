import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Header from './components/Header.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import DataTable from './components/DataTable.jsx';
import SummaryBar from './components/SummaryBar.jsx';
import Dashboard from './components/Dashboard.jsx';
import DetailPage from './components/DetailPage.jsx';
import TabBar from './components/TabBar.jsx';
import CompareTab from './components/CompareTab.jsx';
import InsightsTab from './components/InsightsTab.jsx';
import { useWatchlist, WatchlistFAB, WatchlistPanel } from './components/Watchlist.jsx';

const API = '/api';
const PAGE_SIZE = 50;

const DEFAULT_APPLIED = {
  property_type: '',
  state_codes: '',
};

function parseURLState() {
  try {
    const params = new URLSearchParams(window.location.search);
    const f = params.get('f');
    return {
      filters:   f ? { ...DEFAULT_APPLIED, ...JSON.parse(decodeURIComponent(f)) } : DEFAULT_APPLIED,
      sortCol:   params.get('s') || 'median_sale_price',
      sortDir:   params.get('d') || 'desc',
      page:      Number(params.get('p') || 0),
      activeTab: params.get('t') || 'insights',
      tabSearch: params.get('q') || '',
    };
  } catch {
    return { filters: DEFAULT_APPLIED, sortCol: 'median_sale_price', sortDir: 'desc', page: 0, activeTab: 'insights', tabSearch: '' };
  }
}

const urlState = parseURLState();

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

async function fetchMarketData(filters, page, sortCol, sortDir) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '' && v != null) params.set(k, v);
  });
  params.set('limit', PAGE_SIZE);
  params.set('offset', page * PAGE_SIZE);
  if (sortCol) params.set('sort_col', sortCol);
  if (sortDir) params.set('sort_dir', sortDir);

  const res = await fetch(`${API}/market-data?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch market data');
  return res.json();
}

function useAutoRefresh() {
  const qc = useQueryClient();
  const prevStates = useRef({});

  const { data: statusData } = useQuery({
    queryKey: ['status'],
    queryFn: async () => (await fetch('/api/status')).json(),
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (!statusData?.fetchProgress) return;
    const progress = statusData.fetchProgress;
    let anyJustCompleted = false;
    for (const [type, fp] of Object.entries(progress)) {
      const prev = prevStates.current[type];
      if (prev && prev !== 'done' && fp?.state === 'done') {
        anyJustCompleted = true;
      }
      prevStates.current[type] = fp?.state;
    }
    if (anyJustCompleted) qc.invalidateQueries();
  }, [statusData, qc]);

  return statusData;
}

const ACTIVE_STATES = new Set(['downloading', 'parsing', 'inserting', 'indexing']);

export default function App() {
  const statusData = useAutoRefresh();
  const [appliedFilters, setAppliedFilters] = useState(urlState.filters);
  const [page, setPage]         = useState(urlState.page);
  const [sortCol, setSortCol]   = useState(urlState.sortCol);
  const [sortDir, setSortDir]   = useState(urlState.sortDir);
  const [activeTab, setActiveTab]   = useState(urlState.activeTab);
  const [tabSearch, setTabSearch]   = useState(urlState.tabSearch);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [watchlistOpen, setWatchlistOpen]   = useState(false);

  const debouncedTabSearch = useDebounce(tabSearch, 300);

  const { watchlist, isWatched, toggle: toggleWatchlist } = useWatchlist();

  const effectiveFilters = useMemo(() => ({
    ...appliedFilters,
    region_type: ['compare', 'insights'].includes(activeTab) ? 'metro' : activeTab,
    region_search: debouncedTabSearch,
  }), [appliedFilters, activeTab, debouncedTabSearch]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    setTabSearch('');
    setPage(0);
  }

  function handleInsightsSectionClick({ sortCol, sortDir, regionType: navRegion }) {
    const tab = navRegion || 'metro';
    setActiveTab(tab);
    setSortCol(sortCol);
    setSortDir(sortDir);
    setAppliedFilters(DEFAULT_APPLIED);
    setPage(0);
  }

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams();
    const hasNonDefault = Object.entries(appliedFilters).some(
      ([k, v]) => v !== '' && v != null && DEFAULT_APPLIED[k] !== v
    );
    if (hasNonDefault) params.set('f', encodeURIComponent(JSON.stringify(appliedFilters)));
    if (sortCol !== 'median_sale_price') params.set('s', sortCol);
    if (sortDir !== 'desc') params.set('d', sortDir);
    if (page !== 0) params.set('p', String(page));
    if (activeTab !== 'insights') params.set('t', activeTab);
    if (tabSearch) params.set('q', tabSearch);
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [appliedFilters, sortCol, sortDir, page, activeTab, tabSearch]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['marketData', effectiveFilters, page, sortCol, sortDir],
    queryFn: () => fetchMarketData(effectiveFilters, page, sortCol, sortDir),
    keepPreviousData: true,
  });

  const handleApply = useCallback((filters) => {
    setAppliedFilters(filters);
    setPage(0);
  }, []);

  const handleSort = useCallback((col, dir) => {
    setSortCol(col);
    setSortDir(dir);
    setPage(0);
  }, []);

  const handleExport = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(effectiveFilters).forEach(([k, v]) => {
      if (v !== '' && v != null) params.set(k, v);
    });
    params.set('limit', 50000);
    params.set('offset', 0);
    if (sortCol) params.set('sort_col', sortCol);
    if (sortDir) params.set('sort_dir', sortDir);

    const res = await fetch(`${API}/market-data?${params.toString()}`);
    if (!res.ok) return;
    const json = await res.json();
    const rows = json.rows || [];
    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const v = row[h];
          if (v == null) return '';
          const s = String(v);
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redfin_screener_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [effectiveFilters, sortCol, sortDir]);

  if (selectedMarket) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <DetailPage
          market={selectedMarket}
          onBack={() => setSelectedMarket(null)}
          isWatched={isWatched}
          onWatchlistToggle={toggleWatchlist}
        />
        <WatchlistFAB count={watchlist.length} onClick={() => setWatchlistOpen(true)} />
        {watchlistOpen && (
          <WatchlistPanel
            watchlist={watchlist}
            onMarketClick={m => { setWatchlistOpen(false); setSelectedMarket(m); }}
            onToggle={toggleWatchlist}
            onClose={() => setWatchlistOpen(false)}
          />
        )}
      </div>
    );
  }

  const fetchProgress = statusData?.fetchProgress || {};
  const dbStatus = statusData?.dbStatus || [];
  const activeTypes = Object.entries(fetchProgress).filter(([, fp]) => ACTIVE_STATES.has(fp?.state));
  const noDataYet = dbStatus.length === 0 && activeTypes.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {noDataYet && (
        <div className="bg-blue-600 text-white text-sm px-4 py-2 flex items-center gap-3 flex-wrap">
          <span className="animate-pulse">⬤</span>
          <span className="font-medium">Loading data for the first time — this takes a few minutes.</span>
          <span className="text-blue-200">
            {activeTypes.map(([type, fp]) => {
              const label = type.charAt(0).toUpperCase() + type.slice(1);
              const rows = fp.rowsInserted ? ` (${(fp.rowsInserted / 1000).toFixed(0)}K rows)` : '';
              return `${label}: ${fp.state}${rows}`;
            }).join(' · ')}
          </span>
          <span className="text-blue-200 text-xs">The page will refresh automatically when ready.</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {activeTab !== 'compare' && activeTab !== 'insights' && (
          <FilterPanel onApply={handleApply} regionType={activeTab} defaultFilters={appliedFilters} />
        )}

        <main className="flex-1 overflow-hidden flex flex-col">
          <TabBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            search={tabSearch}
            onSearchChange={v => { setTabSearch(v); setPage(0); }}
          />

          {activeTab === 'compare' ? (
            <CompareTab />
          ) : activeTab === 'insights' ? (
            <InsightsTab onMarketClick={setSelectedMarket} onSectionClick={handleInsightsSectionClick} />
          ) : (
            <>
              <SummaryBar filters={effectiveFilters} />

              <div className="flex-1 overflow-hidden m-4 mt-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col">
                <DataTable
                  data={data?.rows || []}
                  total={data?.total || 0}
                  loading={isLoading || isFetching}
                  page={page}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  onSort={handleSort}
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onRowClick={setSelectedMarket}
                  onExport={handleExport}
                  watchlist={watchlist}
                  onWatchlistToggle={toggleWatchlist}
                />
              </div>
            </>
          )}
        </main>
      </div>

      <WatchlistFAB count={watchlist.length} onClick={() => setWatchlistOpen(true)} />
      {watchlistOpen && (
        <WatchlistPanel
          watchlist={watchlist}
          onMarketClick={m => { setWatchlistOpen(false); setSelectedMarket(m); }}
          onToggle={toggleWatchlist}
          onClose={() => setWatchlistOpen(false)}
        />
      )}
    </div>
  );
}

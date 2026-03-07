import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from './components/Header.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import DataTable from './components/DataTable.jsx';
import SummaryBar from './components/SummaryBar.jsx';
import Dashboard from './components/Dashboard.jsx';
import DetailPage from './components/DetailPage.jsx';

const API = '/api';
const PAGE_SIZE = 50;

// Default applied filters (before any Apply press)
const DEFAULT_APPLIED = {
  region_type: 'metro',
  property_type: '',
  state_codes: '',
};

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

export default function App() {
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_APPLIED);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState('median_sale_price');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedMarket, setSelectedMarket] = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['marketData', appliedFilters, page, sortCol, sortDir],
    queryFn: () => fetchMarketData(appliedFilters, page, sortCol, sortDir),
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
    Object.entries(appliedFilters).forEach(([k, v]) => {
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
  }, [appliedFilters, sortCol, sortDir]);

  if (selectedMarket) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <DetailPage market={selectedMarket} onBack={() => setSelectedMarket(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <FilterPanel onApply={handleApply} />

        <main className="flex-1 overflow-hidden flex flex-col">
          <Dashboard
            regionType={appliedFilters.region_type}
            stateCodes={appliedFilters.state_codes || ''}
            propertyType={appliedFilters.property_type || ''}
            onMarketClick={setSelectedMarket}
          />

          <SummaryBar filters={appliedFilters} />

          <div className="flex-1 overflow-hidden m-4 mt-3 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
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
            />
          </div>
        </main>
      </div>
    </div>
  );
}

import { RefreshCw, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AboutModal from './AboutModal.jsx';

const API = '/api';

const REGION_TYPES = [
  { value: 'metro', label: 'Metro' },
  { value: 'county', label: 'County' },
  { value: 'city', label: 'City' },
  { value: 'zip', label: 'ZIP Code' },
  { value: 'state', label: 'State' },
];

async function fetchStatus() {
  const res = await fetch(`${API}/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

async function triggerRefresh(regionType) {
  const res = await fetch(`${API}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ region_type: regionType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Refresh failed');
  }
  return res.json();
}

function StatusDot({ state }) {
  if (!state) return <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />;
  if (state === 'done') return <CheckCircle size={13} className="text-green-500 flex-shrink-0" />;
  if (state === 'error') return <AlertCircle size={13} className="text-red-500 flex-shrink-0" />;
  return <Loader2 size={13} className="text-blue-500 flex-shrink-0 animate-spin" />;
}

export default function Header() {
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState('metro');
  const [errorMsg, setErrorMsg] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  const { data: statusData } = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
    refetchInterval: 3000,
  });

  const mutation = useMutation({
    mutationFn: triggerRefresh,
    onSuccess: () => {
      setErrorMsg('');
      setTimeout(() => qc.invalidateQueries(), 2000);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const dbStatus = statusData?.dbStatus || [];
  const fetchProgress = statusData?.fetchProgress || {};

  const isAnyFetching = Object.values(fetchProgress).some(
    s => s.state === 'downloading' || s.state === 'parsing' || s.state === 'inserting'
  );

  const isFetching = (type) => {
    const s = fetchProgress[type]?.state;
    return s === 'downloading' || s === 'parsing' || s === 'inserting';
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow">
            <span className="text-white text-sm font-bold">R</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">REALTR</h1>
            <p className="text-xs text-gray-400">Powered by Redfin data</p>
          </div>
        </div>

        {/* Data status chips */}
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {REGION_TYPES.map(({ value, label }) => {
            const db = dbStatus.find(s => s.region_type === value);
            const fp = fetchProgress[value];
            const state = fp?.state || (db ? 'done' : null);
            const loading = isFetching(value);
            return (
              <div
                key={value}
                className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 text-xs"
              >
                <StatusDot state={state} />
                <span className="font-medium text-gray-700">{label}</span>
                {db && !loading && (
                  <span className="text-gray-400">
                    {db.row_count?.toLocaleString()} · {db.period_end?.slice(0, 7)}
                  </span>
                )}
                {loading && (
                  <span className="text-blue-500">
                    {fp?.rowsParsed ? `${fp.rowsParsed.toLocaleString()}...` : fp?.state}
                  </span>
                )}
                {!db && !state && (
                  <span className="text-gray-300">no data</span>
                )}
              </div>
            );
          })}
        </div>

        {/* About button */}
        <button
          onClick={() => setShowAbout(true)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors flex-shrink-0"
        >
          <Info size={15} /> About
        </button>

        {/* Refresh controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {REGION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label} data</option>
            ))}
          </select>
          <button
            onClick={() => { setErrorMsg(''); mutation.mutate(selectedType); }}
            disabled={isAnyFetching || mutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={isAnyFetching ? 'animate-spin' : ''} />
            {isAnyFetching ? 'Fetching...' : 'Fetch Data'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </header>
  );
}

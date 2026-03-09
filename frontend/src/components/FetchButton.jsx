import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API = '/api';

const REGION_LABELS = { metro: 'Metro', county: 'County', city: 'City', zip: 'ZIP', state: 'State' };

async function fetchStatus() {
  const res = await fetch(`${API}/status`);
  if (!res.ok) throw new Error('Failed');
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

export default function FetchButton({ regionType }) {
  const qc = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

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

  const fetchProgress = statusData?.fetchProgress || {};
  const fp = fetchProgress[regionType];
  const isThisFetching = ['downloading', 'parsing', 'inserting'].includes(fp?.state);
  const isAnyFetching = Object.values(fetchProgress).some(
    s => ['downloading', 'parsing', 'inserting'].includes(s?.state)
  );
  const label = REGION_LABELS[regionType] || regionType;

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {errorMsg && (
        <span className="text-xs text-red-500 max-w-[140px] truncate" title={errorMsg}>{errorMsg}</span>
      )}
      <button
        onClick={() => { setErrorMsg(''); mutation.mutate(regionType); }}
        disabled={isAnyFetching || mutation.isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white text-xs font-medium rounded-lg transition-colors shadow-sm whitespace-nowrap"
      >
        <RefreshCw size={12} className={isThisFetching ? 'animate-spin' : ''} />
        {isThisFetching
          ? fp?.rowsParsed ? `${Math.round(fp.rowsParsed / 1000)}K rows…` : 'Fetching…'
          : `Fetch ${label} Data`}
      </button>
    </div>
  );
}

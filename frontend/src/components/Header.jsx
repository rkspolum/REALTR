import { CheckCircle, AlertCircle, Loader2, Info, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AboutModal from './AboutModal.jsx';
import Logo from './Logo.jsx';

const API = '/api';

const REGION_TYPES = [
  { value: 'metro',  label: 'Metro' },
  { value: 'county', label: 'County' },
  { value: 'zip',    label: 'ZIP' },
  { value: 'state',  label: 'State' },
];

function StatusDot({ state }) {
  if (!state) return <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" />;
  if (state === 'done') return <CheckCircle size={12} className="text-green-500 flex-shrink-0" />;
  if (state === 'error') return <AlertCircle size={12} className="text-red-500 flex-shrink-0" />;
  return <Loader2 size={12} className="text-blue-500 flex-shrink-0 animate-spin" />;
}

export default function Header() {
  const [showAbout, setShowAbout] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('realtr_theme', next ? 'dark' : 'light');
  }

  const { data: statusData } = useQuery({
    queryKey: ['status'],
    queryFn: async () => (await fetch(`${API}/status`)).json(),
    refetchInterval: 4000,
  });

  const dbStatus = statusData?.dbStatus || [];
  const fetchProgress = statusData?.fetchProgress || {};

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm dark:shadow-gray-950/50">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-4">

        {/* Logo + Title */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Logo size={36} />
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight tracking-tight">REALTR</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">Powered by Redfin data</p>
          </div>
        </div>

        {/* Data status chips */}
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {REGION_TYPES.map(({ value, label }) => {
            const db = dbStatus.find(s => s.region_type === value);
            const fp = fetchProgress[value];
            const isActive = ['downloading', 'parsing', 'inserting', 'indexing'].includes(fp?.state);
            const state = fp?.state || (db ? 'done' : null);
            return (
              <div
                key={value}
                className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 text-xs"
              >
                <StatusDot state={state} />
                <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                {isActive ? (
                  <span className="text-blue-500">
                    {fp?.rowsInserted ? `${(fp.rowsInserted / 1000).toFixed(0)}K rows…` : fp?.state}
                  </span>
                ) : db ? (
                  <span className="text-gray-400 dark:text-gray-500">{db.period_end?.slice(0, 7)}</span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">no data</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex-shrink-0"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* About button */}
        <button
          onClick={() => setShowAbout(true)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-shrink-0"
        >
          <Info size={15} /> About
        </button>
      </div>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </header>
  );
}

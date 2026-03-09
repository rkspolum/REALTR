import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, X } from 'lucide-react';
import Dashboard from './Dashboard.jsx';

const API = '/api';

const REGION_TYPES = [
  { value: 'metro',   label: 'Metro' },
  { value: 'county',  label: 'County' },
  { value: 'city',    label: 'City' },
  { value: 'state',   label: 'State' },
];

export default function InsightsTab({ onMarketClick }) {
  const [regionType, setRegionType] = useState('metro');
  const [selectedStates, setSelectedStates] = useState([]);
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const pickerRef = useRef(null);

  const { data: states = [] } = useQuery({
    queryKey: ['states'],
    queryFn: async () => (await fetch(`${API}/states`)).json(),
  });

  useEffect(() => {
    function handler(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setStatePickerOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function toggleState(code) {
    setSelectedStates(prev =>
      prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
    );
  }

  const stateCodes = selectedStates.join(',');

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Market Insights</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Top markets across key categories</p>
        </div>

        {/* Region type pills */}
        <div className="flex items-center gap-1.5">
          {REGION_TYPES.map(rt => (
            <button
              key={rt.value}
              onClick={() => setRegionType(rt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${regionType === rt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              {rt.label}
            </button>
          ))}
        </div>

        {/* State filter */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setStatePickerOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
              ${selectedStates.length > 0
                ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}`}
          >
            {selectedStates.length > 0 ? (
              <>States: {selectedStates.length} selected</>
            ) : (
              <>All States</>
            )}
            <ChevronDown size={12} className={`transition-transform ${statePickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {selectedStates.length > 0 && (
            <button
              onClick={() => setSelectedStates([])}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
            >
              <X size={9} />
            </button>
          )}

          {statePickerOpen && (
            <div className="absolute top-full mt-1 left-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-48 max-h-64 overflow-y-auto">
              <div className="px-2 py-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Filter by State</span>
                {selectedStates.length > 0 && (
                  <button onClick={() => setSelectedStates([])} className="text-xs text-red-400 hover:text-red-600">Clear</button>
                )}
              </div>
              {states.map(s => (
                <label
                  key={s.state_code}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStates.includes(s.state_code)}
                    onChange={() => toggleState(s.state_code)}
                    className="accent-blue-600 flex-shrink-0"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.state_code}</span>
                </label>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Dashboard sections */}
      <div className="p-4">
        <Dashboard
          regionType={regionType}
          stateCodes={stateCodes}
          propertyType=""
          onMarketClick={onMarketClick}
        />
      </div>
    </div>
  );
}

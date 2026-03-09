import { Search, X } from 'lucide-react';

const TABS = [
  { value: 'insights', label: 'Insights' },
  { value: 'metro',    label: 'Metro' },
  { value: 'county',   label: 'County' },
  { value: 'city',     label: 'City' },
  { value: 'state',    label: 'State' },
];

const SEARCH_PLACEHOLDER = {
  metro:  'Search metro areas…',
  county: 'Search counties…',
  city:   'Search cities…',
  state:  'Search states…',
};

const REGION_TABS = new Set(['metro', 'county', 'city', 'state']);

export default function TabBar({ activeTab, onTabChange, search, onSearchChange }) {
  const showSearch = REGION_TABS.has(activeTab);

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 flex-shrink-0">
      <div className="flex items-center gap-0.5">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${activeTab === tab.value
                ? tab.value === 'insights'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                  : 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}
          >
            {tab.label}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2 self-center flex-shrink-0" />

        <button
          onClick={() => onTabChange('compare')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            ${activeTab === 'compare'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}
        >
          Compare
        </button>

        {showSearch && (
          <div className="ml-auto py-1.5 flex items-center gap-2 flex-shrink-0">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                placeholder={SEARCH_PLACEHOLDER[activeTab] || 'Search…'}
                className="pl-7 pr-7 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-52 transition-colors"
              />
              {search && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

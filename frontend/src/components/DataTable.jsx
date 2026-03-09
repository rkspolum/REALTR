import {
  useReactTable, getCoreRowModel, flexRender, createColumnHelper,
} from '@tanstack/react-table';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
  Download, Star, Eye, Check, Link,
} from 'lucide-react';
import { useMemo, useState, useEffect, useRef } from 'react';
import MarketTag from './MarketTag.jsx';

const ch = createColumnHelper();

const fmtPrice  = v => v == null ? '—' : v >= 1_000_000 ? `$${(v/1_000_000).toFixed(2)}M` : `$${Math.round(v).toLocaleString()}`;
const fmtPct    = (v, d = 1) => v == null ? '—' : `${v >= 0 ? '+' : ''}${(v*100).toFixed(d)}%`;
const fmtNum    = v => v == null ? '—' : Number(v).toLocaleString();
const fmtDollar = v => v == null ? '—' : `$${Math.round(v)}`;

function PctCell({ v, invert = false }) {
  if (v == null) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  const pct = v * 100;
  const good = invert ? pct < 0 : pct > 0;
  const bad  = invert ? pct > 0 : pct < 0;
  return (
    <span className={`font-medium ${good ? 'text-green-600 dark:text-green-400' : bad ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

function DOMCell({ v }) {
  if (v == null) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  return <span className={v <= 20 ? 'text-green-700 dark:text-green-400 font-medium' : v >= 60 ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>{Math.round(v)}</span>;
}

function MOSCell({ v }) {
  if (v == null) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  return <span className={v <= 3 ? 'text-orange-600 dark:text-orange-400 font-medium' : v >= 6 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>{Number(v).toFixed(1)}</span>;
}

function STLCell({ v }) {
  if (v == null) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  const pct = v * 100;
  return <span className={pct >= 100 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>{pct.toFixed(1)}%</span>;
}

const BASE_COLUMNS = [
  ch.accessor('months_of_supply', {
    header: 'Market',
    id: 'market_tag',
    cell: info => <MarketTag mos={info.getValue()} />,
    size: 130,
    enableSorting: false,
  }),
  ch.accessor('region', {
    header: 'Region',
    cell: info => (
      <div className="max-w-[180px]">
        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{info.getValue()}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">{info.row.original.region_type}</div>
      </div>
    ),
    size: 190,
  }),
  ch.accessor('state_code', {
    header: 'State',
    cell: info => <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{info.getValue() || '—'}</span>,
    size: 60,
  }),
  ch.accessor('property_type', {
    header: 'Type',
    cell: info => {
      const v = info.getValue();
      const abbr = (v || '').replace('Single Family Residential','SFR').replace('All Residential','All')
        .replace('Condo/Co-op','Condo').replace('Townhouse','TH').replace('Multi-Family (2-4 Unit)','Multi');
      return <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">{abbr || '—'}</span>;
    },
    size: 75,
  }),
  ch.accessor('median_sale_price', {
    header: 'Median Price',
    cell: info => <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtPrice(info.getValue())}</span>,
    size: 115,
  }),
  ch.accessor('median_sale_price_yoy', {
    header: 'Price YoY',
    cell: info => <PctCell v={info.getValue()} />,
    size: 90,
  }),
  ch.accessor('median_ppsf', {
    header: '$/SqFt',
    cell: info => <span className="text-gray-700 dark:text-gray-300">{fmtDollar(info.getValue())}</span>,
    size: 75,
  }),
  ch.accessor('median_list_price', {
    header: 'List Price',
    cell: info => <span className="text-gray-700 dark:text-gray-300">{fmtPrice(info.getValue())}</span>,
    size: 105,
  }),
  ch.accessor('median_dom', {
    header: 'DOM',
    cell: info => <DOMCell v={info.getValue()} />,
    size: 65,
  }),
  ch.accessor('months_of_supply', {
    header: 'MoS',
    id: 'months_of_supply',
    cell: info => <MOSCell v={info.getValue()} />,
    size: 65,
  }),
  ch.accessor('avg_sale_to_list', {
    header: 'Sale/List',
    cell: info => <STLCell v={info.getValue()} />,
    size: 85,
  }),
  ch.accessor('sold_above_list', {
    header: '% > List',
    cell: info => <span className="text-gray-700 dark:text-gray-300">{info.getValue() != null ? `${(info.getValue()*100).toFixed(0)}%` : '—'}</span>,
    size: 75,
  }),
  ch.accessor('homes_sold', {
    header: 'Homes Sold',
    cell: info => <span className="text-gray-700 dark:text-gray-300">{fmtNum(info.getValue())}</span>,
    size: 95,
  }),
  ch.accessor('homes_sold_yoy', {
    header: 'Sold YoY',
    cell: info => <PctCell v={info.getValue()} />,
    size: 85,
  }),
  ch.accessor('new_listings', {
    header: 'New Listings',
    cell: info => <span className="text-gray-700 dark:text-gray-300">{fmtNum(info.getValue())}</span>,
    size: 100,
  }),
  ch.accessor('inventory', {
    header: 'Inventory',
    cell: info => <span className="text-gray-700 dark:text-gray-300">{fmtNum(info.getValue())}</span>,
    size: 90,
  }),
  ch.accessor('inventory_yoy', {
    header: 'Inv. YoY',
    cell: info => <PctCell v={info.getValue()} />,
    size: 85,
  }),
  ch.accessor('price_drops', {
    header: '% Price Drop',
    cell: info => <span className="text-gray-700 dark:text-gray-300">{info.getValue() != null ? `${(info.getValue()*100).toFixed(0)}%` : '—'}</span>,
    size: 100,
  }),
  ch.accessor('off_market_in_two_weeks', {
    header: 'Off Mkt <2wk',
    cell: info => <span className="text-gray-700 dark:text-gray-300">{info.getValue() != null ? `${(info.getValue()*100).toFixed(0)}%` : '—'}</span>,
    size: 110,
  }),
  ch.accessor('period_end', {
    header: 'Period',
    cell: info => <span className="text-gray-500 dark:text-gray-400">{info.getValue()?.slice(0, 7) || '—'}</span>,
    size: 80,
  }),
];

function SortIcon({ column }) {
  const s = column.getIsSorted();
  if (s === 'asc')  return <ChevronUp   size={12} className="text-blue-500" />;
  if (s === 'desc') return <ChevronDown size={12} className="text-blue-500" />;
  return column.getCanSort() ? <ChevronsUpDown size={12} className="text-gray-300 dark:text-gray-600" /> : null;
}

export default function DataTable({
  data = [], total = 0, loading, page, pageSize,
  onPageChange, onSort, sortCol, sortDir, onRowClick, onExport,
  watchlist, onWatchlistToggle,
}) {
  const [columnVisibility, setColumnVisibility] = useState(() => {
    try { return JSON.parse(localStorage.getItem('realtr_col_vis')) || {}; }
    catch { return {}; }
  });
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const colPickerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('realtr_col_vis', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    function handler(e) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) {
        setColPickerOpen(false);
      }
    }
    if (colPickerOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colPickerOpen]);

  const columns = useMemo(() => {
    const watchCol = ch.display({
      id: 'watchlist_star',
      header: () => <Star size={11} className="text-gray-300 dark:text-gray-600" />,
      cell: info => {
        const m = info.row.original;
        const k = `${m.region_type}:${m.region}:${m.state_code || ''}:${m.property_type || ''}`;
        const watched = watchlist?.some(w => `${w.region_type}:${w.region}:${w.state_code || ''}:${w.property_type || ''}` === k);
        return (
          <button
            onClick={e => { e.stopPropagation(); onWatchlistToggle?.(m); }}
            className="p-0.5 hover:scale-125 transition-transform block"
          >
            <Star size={13} className={watched ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-700 hover:text-gray-400'} />
          </button>
        );
      },
      size: 32,
      enableSorting: false,
    });
    return [watchCol, ...BASE_COLUMNS];
  }, [watchlist, onWatchlistToggle]);

  const sorting = useMemo(
    () => sortCol ? [{ id: sortCol, desc: sortDir !== 'asc' }] : [],
    [sortCol, sortDir]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    state: { sorting, columnVisibility },
    onSortingChange: upd => {
      const next = typeof upd === 'function' ? upd(sorting) : upd;
      if (next.length > 0) onSort(next[0].id, next[0].desc ? 'desc' : 'asc');
    },
    onColumnVisibilityChange: setColumnVisibility,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);
  const startRow = page * pageSize + 1;
  const endRow   = Math.min((page + 1) * pageSize, total);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const hiddenCount = Object.values(columnVisibility).filter(v => v === false).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="th-cell border-r border-gray-100 dark:border-gray-700 last:border-r-0"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <SortIcon column={header.column} />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="text-center py-12 text-gray-400 dark:text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Loading…
                </div>
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-12 text-gray-400 dark:text-gray-500">
                No data found. {total === 0 && 'Fetch data from Redfin using the button above, then click Apply.'}
              </td></tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={`border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-950/20
                    ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/40'}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="td-cell border-r border-gray-100 dark:border-gray-800 last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {total > 0 ? `${startRow.toLocaleString()}–${endRow.toLocaleString()} of ${total.toLocaleString()} markets` : 'No results'}
          </span>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 text-gray-500 dark:text-gray-400 rounded-lg transition-colors"
          >
            <Download size={12} /> Export CSV
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 hover:border-green-400 hover:text-green-600 dark:hover:border-green-500 dark:hover:text-green-400 text-gray-500 dark:text-gray-400 rounded-lg transition-colors"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Link size={12} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          {/* Column visibility picker */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setColPickerOpen(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 border rounded-lg transition-colors
                ${hiddenCount > 0
                  ? 'border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400'}`}
            >
              <Eye size={12} />
              Columns
              {hiddenCount > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{hiddenCount}</span>}
            </button>
            {colPickerOpen && (
              <div className="absolute bottom-full mb-1.5 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 w-52 py-2">
                <div className="px-3 pb-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 mb-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Show / Hide Columns</span>
                  <button
                    onClick={() => setColumnVisibility({})}
                    className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Show all
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {table.getAllLeafColumns()
                    .filter(col => col.id !== 'watchlist_star')
                    .map(col => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2.5 py-1.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={col.getIsVisible()}
                          onChange={col.getToggleVisibilityHandler()}
                          className="accent-blue-600"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">{col.columnDef.header}</span>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => onPageChange(page - 1)} disabled={page === 0}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">Page {page + 1} of {totalPages || 1}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

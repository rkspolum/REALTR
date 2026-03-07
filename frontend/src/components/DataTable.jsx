import {
  useReactTable, getCoreRowModel, flexRender, createColumnHelper,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useMemo } from 'react';
import MarketTag from './MarketTag.jsx';

const ch = createColumnHelper();

const fmtPrice = v => v == null ? '—' : v >= 1_000_000 ? `$${(v/1_000_000).toFixed(2)}M` : `$${Math.round(v).toLocaleString()}`;
const fmtPct   = (v, d = 1) => v == null ? '—' : `${v >= 0 ? '+' : ''}${(v*100).toFixed(d)}%`;
const fmtNum   = v => v == null ? '—' : Number(v).toLocaleString();
const fmtDollar = v => v == null ? '—' : `$${Math.round(v)}`;

function PctCell({ v, invert = false }) {
  if (v == null) return <span className="text-gray-300">—</span>;
  const pct = v * 100;
  const good = invert ? pct < 0 : pct > 0;
  const bad  = invert ? pct > 0 : pct < 0;
  return (
    <span className={`font-medium ${good ? 'text-green-600' : bad ? 'text-red-500' : 'text-gray-500'}`}>
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

function DOMCell({ v }) {
  if (v == null) return <span className="text-gray-300">—</span>;
  return <span className={v <= 20 ? 'text-green-700 font-medium' : v >= 60 ? 'text-red-500 font-medium' : 'text-gray-700'}>{Math.round(v)}</span>;
}

function MOSCell({ v }) {
  if (v == null) return <span className="text-gray-300">—</span>;
  return <span className={v <= 3 ? 'text-orange-600 font-medium' : v >= 6 ? 'text-blue-600 font-medium' : 'text-gray-700'}>{Number(v).toFixed(1)}</span>;
}

function STLCell({ v }) {
  if (v == null) return <span className="text-gray-300">—</span>;
  const pct = v * 100;
  return <span className={pct >= 100 ? 'text-orange-600 font-medium' : 'text-gray-700'}>{pct.toFixed(1)}%</span>;
}

const COLUMNS = [
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
        <div className="font-medium text-gray-900 truncate">{info.getValue()}</div>
        <div className="text-xs text-gray-400 capitalize">{info.row.original.region_type}</div>
      </div>
    ),
    size: 190,
  }),
  ch.accessor('state_code', {
    header: 'State',
    cell: info => <span className="font-mono text-sm">{info.getValue() || '—'}</span>,
    size: 60,
  }),
  ch.accessor('property_type', {
    header: 'Type',
    cell: info => {
      const v = info.getValue();
      const abbr = (v || '').replace('Single Family Residential','SFR').replace('All Residential','All')
        .replace('Condo/Co-op','Condo').replace('Townhouse','TH').replace('Multi-Family (2-4 Unit)','Multi');
      return <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{abbr || '—'}</span>;
    },
    size: 75,
  }),
  ch.accessor('median_sale_price', {
    header: 'Median Price',
    cell: info => <span className="font-semibold">{fmtPrice(info.getValue())}</span>,
    size: 115,
  }),
  ch.accessor('median_sale_price_yoy', {
    header: 'Price YoY',
    cell: info => <PctCell v={info.getValue()} />,
    size: 90,
  }),
  ch.accessor('median_ppsf', {
    header: '$/SqFt',
    cell: info => fmtDollar(info.getValue()),
    size: 75,
  }),
  ch.accessor('median_list_price', {
    header: 'List Price',
    cell: info => fmtPrice(info.getValue()),
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
    cell: info => info.getValue() != null ? `${(info.getValue()*100).toFixed(0)}%` : '—',
    size: 75,
  }),
  ch.accessor('homes_sold', {
    header: 'Homes Sold',
    cell: info => fmtNum(info.getValue()),
    size: 95,
  }),
  ch.accessor('homes_sold_yoy', {
    header: 'Sold YoY',
    cell: info => <PctCell v={info.getValue()} />,
    size: 85,
  }),
  ch.accessor('new_listings', {
    header: 'New Listings',
    cell: info => fmtNum(info.getValue()),
    size: 100,
  }),
  ch.accessor('inventory', {
    header: 'Inventory',
    cell: info => fmtNum(info.getValue()),
    size: 90,
  }),
  ch.accessor('inventory_yoy', {
    header: 'Inv. YoY',
    cell: info => <PctCell v={info.getValue()} />,
    size: 85,
  }),
  ch.accessor('price_drops', {
    header: '% Price Drop',
    cell: info => info.getValue() != null ? `${(info.getValue()*100).toFixed(0)}%` : '—',
    size: 100,
  }),
  ch.accessor('off_market_in_two_weeks', {
    header: 'Off Mkt <2wk',
    cell: info => info.getValue() != null ? `${(info.getValue()*100).toFixed(0)}%` : '—',
    size: 110,
  }),
  ch.accessor('period_end', {
    header: 'Period',
    cell: info => info.getValue()?.slice(0, 7) || '—',
    size: 80,
  }),
];

function SortIcon({ column }) {
  const s = column.getIsSorted();
  if (s === 'asc')  return <ChevronUp   size={12} className="text-blue-500" />;
  if (s === 'desc') return <ChevronDown size={12} className="text-blue-500" />;
  return column.getCanSort() ? <ChevronsUpDown size={12} className="text-gray-300" /> : null;
}

export default function DataTable({
  data = [], total = 0, loading, page, pageSize,
  onPageChange, onSort, sortCol, sortDir, onRowClick, onExport,
}) {
  const sorting = useMemo(
    () => sortCol ? [{ id: sortCol, desc: sortDir !== 'asc' }] : [],
    [sortCol, sortDir]
  );

  const table = useReactTable({
    data,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    state: { sorting },
    onSortingChange: upd => {
      const next = typeof upd === 'function' ? upd(sorting) : upd;
      if (next.length > 0) onSort(next[0].id, next[0].desc ? 'desc' : 'asc');
    },
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);
  const startRow = page * pageSize + 1;
  const endRow   = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="th-cell border-r border-gray-100 last:border-r-0"
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
              <tr><td colSpan={COLUMNS.length} className="text-center py-12 text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Loading…
                </div>
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={COLUMNS.length} className="text-center py-12 text-gray-400">
                No data found. {total === 0 && 'Fetch data from Redfin using the button above, then click Apply.'}
              </td></tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-blue-50/60
                    ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="td-cell border-r border-gray-100 last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + Export */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {total > 0 ? `${startRow.toLocaleString()}–${endRow.toLocaleString()} of ${total.toLocaleString()} markets` : 'No results'}
          </span>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-500 rounded-lg transition-colors"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => onPageChange(page - 1)} disabled={page === 0}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-700">Page {page + 1} of {totalPages || 1}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

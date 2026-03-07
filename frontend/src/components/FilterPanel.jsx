import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, RotateCcw, CheckCheck, Search } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import DualRangeSlider from './DualRangeSlider.jsx';
import PresetManager from './PresetManager.jsx';
import InfoTip from './InfoTip.jsx';

const API = '/api';

const REGION_TYPES = [
  { value: 'metro',  label: 'Metro Area' },
  { value: 'county', label: 'County' },
  { value: 'city',   label: 'City' },
  { value: 'zip',    label: 'ZIP Code' },
  { value: 'state',  label: 'State' },
];

const MARKET_TYPES = [
  { value: '',         label: 'All Markets' },
  { value: 'sellers',  label: "Seller's (<3 mo)" },
  { value: 'balanced', label: 'Balanced (3–6 mo)' },
  { value: 'buyers',   label: "Buyer's (>6 mo)" },
];

const FALLBACK = {
  price:       { min: 0,     max: 2_000_000 },
  price_yoy:   { min: -0.3,  max: 0.5 },
  ppsf:        { min: 50,    max: 800 },
  dom:         { min: 0,     max: 180 },
  mos:         { min: 0,     max: 18 },
  stl:         { min: 0.85,  max: 1.08 },
  sal:         { min: 0,     max: 0.9 },
  homes_sold:  { min: 0,     max: 5000 },
  new_listings:{ min: 0,     max: 5000 },
  inventory:   { min: 0,     max: 10000 },
  inv_yoy:     { min: -0.5,  max: 1.5 },
  price_drops: { min: 0,     max: 1.0 },
};

const CAPS = {
  price:       { min: 0,     max: 10_000_000 },
  price_yoy:   { min: -0.95, max: 1.0 },
  ppsf:        { min: 0,     max: 2000 },
  dom:         { min: 0,     max: 365 },
  mos:         { min: 0,     max: 24 },
  stl:         { min: 0.5,   max: 1.3 },
  sal:         { min: 0,     max: 1.0 },
  homes_sold:  { min: 0,     max: 50_000 },
  new_listings:{ min: 0,     max: 50_000 },
  inventory:   { min: 0,     max: 100_000 },
  inv_yoy:     { min: -1.0,  max: 3.0 },
  price_drops: { min: 0,     max: 1.0 },
};

function cap(v, rk, bound) {
  if (v == null) return FALLBACK[rk][bound];
  return bound === 'min' ? Math.max(v, CAPS[rk].min) : Math.min(v, CAPS[rk].max);
}

function buildRanges(api) {
  if (!api) return FALLBACK;
  return {
    price:        { min: cap(api.price_min,        'price',        'min'), max: cap(api.price_max,        'price',        'max') },
    price_yoy:    { min: cap(api.price_yoy_min,    'price_yoy',    'min'), max: cap(api.price_yoy_max,    'price_yoy',    'max') },
    ppsf:         { min: cap(api.ppsf_min,          'ppsf',         'min'), max: cap(api.ppsf_max,          'ppsf',         'max') },
    dom:          { min: cap(api.dom_min,            'dom',          'min'), max: cap(api.dom_max,            'dom',          'max') },
    mos:          { min: cap(api.mos_min,            'mos',          'min'), max: cap(api.mos_max,            'mos',          'max') },
    stl:          { min: cap(api.stl_min,            'stl',          'min'), max: cap(api.stl_max,            'stl',          'max') },
    sal:          { min: cap(api.sal_min,            'sal',          'min'), max: cap(api.sal_max,            'sal',          'max') },
    homes_sold:   { min: cap(api.homes_sold_min,    'homes_sold',   'min'), max: cap(api.homes_sold_max,    'homes_sold',   'max') },
    new_listings: { min: cap(api.new_listings_min,  'new_listings', 'min'), max: cap(api.new_listings_max,  'new_listings', 'max') },
    inventory:    { min: cap(api.inventory_min,      'inventory',    'min'), max: cap(api.inventory_max,      'inventory',    'max') },
    inv_yoy:      { min: cap(api.inv_yoy_min,        'inv_yoy',      'min'), max: cap(api.inv_yoy_max,        'inv_yoy',      'max') },
    price_drops:  { min: cap(api.price_drops_min,   'price_drops',  'min'), max: cap(api.price_drops_max,   'price_drops',  'max') },
  };
}

function makeDefaultLocal(ranges, regionType = 'metro') {
  return {
    region_type: regionType, property_type: '', state_codes: '', market_type: '', region_search: '',
    price_min: ranges.price.min,             price_max: ranges.price.max,
    price_yoy_min: ranges.price_yoy.min,     price_yoy_max: ranges.price_yoy.max,
    ppsf_min: ranges.ppsf.min,               ppsf_max: ranges.ppsf.max,
    dom_min: ranges.dom.min,                 dom_max: ranges.dom.max,
    mos_min: ranges.mos.min,                 mos_max: ranges.mos.max,
    stl_min: ranges.stl.min,                 stl_max: ranges.stl.max,
    sal_min: ranges.sal.min,                 sal_max: ranges.sal.max,
    homes_sold_min: ranges.homes_sold.min,   homes_sold_max: ranges.homes_sold.max,
    new_listings_min: ranges.new_listings.min, new_listings_max: ranges.new_listings.max,
    inventory_min: ranges.inventory.min,     inventory_max: ranges.inventory.max,
    inv_yoy_min: ranges.inv_yoy.min,         inv_yoy_max: ranges.inv_yoy.max,
    price_drops_min: ranges.price_drops.min, price_drops_max: ranges.price_drops.max,
  };
}

function toApplied(local, ranges) {
  const f = {
    region_type:   local.region_type,
    property_type: local.property_type,
    state_codes:   local.state_codes,
    market_type:   local.market_type,
    region_search: local.region_search,
  };
  const mappings = [
    ['price_min',         'price_max',         'min_price',        'max_price',        'price'],
    ['price_yoy_min',     'price_yoy_max',     'min_price_yoy',    'max_price_yoy',    'price_yoy'],
    ['ppsf_min',          'ppsf_max',          'min_ppsf',         'max_ppsf',         'ppsf'],
    ['dom_min',           'dom_max',           'min_dom',          'max_dom',          'dom'],
    ['mos_min',           'mos_max',           'min_mos',          'max_mos',          'mos'],
    ['stl_min',           'stl_max',           'min_stl',          'max_stl',          'stl'],
    ['sal_min',           'sal_max',           'min_sal',          'max_sal',          'sal'],
    ['homes_sold_min',    'homes_sold_max',    'min_homes_sold',   'max_homes_sold',   'homes_sold'],
    ['new_listings_min',  'new_listings_max',  'min_new_listings', 'max_new_listings', 'new_listings'],
    ['inventory_min',     'inventory_max',     'min_inventory',    'max_inventory',    'inventory'],
    ['inv_yoy_min',       'inv_yoy_max',       'min_inv_yoy',      'max_inv_yoy',      'inv_yoy'],
    ['price_drops_min',   'price_drops_max',   'min_price_drops',  'max_price_drops',  'price_drops'],
  ];
  for (const [lMin, lMax, aMin, aMax, rk] of mappings) {
    if (local[lMin] !== ranges[rk].min) f[aMin] = local[lMin];
    if (local[lMax] !== ranges[rk].max) f[aMax] = local[lMax];
  }
  return f;
}

const fmtPrice   = v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(2)}M` : `$${Math.round(v/1000)}K`;
const fmtPct     = v => `${v >= 0 ? '+' : ''}${(v*100).toFixed(0)}%`;
const fmtPctFine = v => `${v >= 0 ? '+' : ''}${(v*100).toFixed(1)}%`;
const fmtDollar  = v => `$${Math.round(v)}`;
const fmtDays    = v => `${Math.round(v)}d`;
const fmtMonths  = v => `${Number(v).toFixed(1)}mo`;
const fmtNum     = v => Math.round(v).toLocaleString();

const SLIDER_SECTIONS = [
  {
    title: 'Price',
    sliders: [
      { label: 'Median Sale Price',    minKey: 'price_min',         maxKey: 'price_max',         rk: 'price',        step: 5000,  fmt: fmtPrice,   tip: 'The midpoint sale price — half of homes sold for more, half for less.' },
      { label: 'Price Change YoY',     minKey: 'price_yoy_min',     maxKey: 'price_yoy_max',     rk: 'price_yoy',    step: 0.01,  fmt: fmtPct,     tip: 'Year-over-year % change in median sale price. Positive = appreciation.' },
      { label: 'Median $/SqFt',        minKey: 'ppsf_min',          maxKey: 'ppsf_max',          rk: 'ppsf',         step: 5,     fmt: fmtDollar,  tip: 'Median price per square foot of sold homes. Useful for comparing value across markets.' },
      { label: 'Price Drop %',         minKey: 'price_drops_min',   maxKey: 'price_drops_max',   rk: 'price_drops',  step: 0.01,  fmt: fmtPct,     tip: 'Percentage of active listings with at least one price reduction. High values signal softening demand.', note: 'Active listings with reductions' },
    ],
  },
  {
    title: 'Market Conditions',
    sliders: [
      { label: 'Days on Market',       minKey: 'dom_min',           maxKey: 'dom_max',           rk: 'dom',          step: 1,     fmt: fmtDays,    tip: 'Median days from listing to accepted offer. Under 20 = hot market. Over 60 = slow market with buyer leverage.' },
      { label: 'Months of Supply',     minKey: 'mos_min',           maxKey: 'mos_max',           rk: 'mos',          step: 0.1,   fmt: fmtMonths,  tip: "Months to sell all inventory at the current pace. Under 3 = seller's market. Over 6 = buyer's market.", note: "<3 seller's · >6 buyer's" },
      { label: 'Sale-to-List Ratio',   minKey: 'stl_min',           maxKey: 'stl_max',           rk: 'stl',          step: 0.001, fmt: fmtPctFine, tip: 'Average ratio of final sale price to list price. Over 100% = homes closing above asking (bidding wars).', note: '>100% = bidding wars' },
      { label: '% Sold Above List',    minKey: 'sal_min',           maxKey: 'sal_max',           rk: 'sal',          step: 0.01,  fmt: fmtPct,     tip: 'Percentage of homes that sold for more than their list price. High % = highly competitive market.' },
    ],
  },
  {
    title: 'Volume & Inventory',
    sliders: [
      { label: 'Homes Sold',           minKey: 'homes_sold_min',    maxKey: 'homes_sold_max',    rk: 'homes_sold',   step: 10,    fmt: fmtNum,     tip: 'Total number of homes sold in the most recent data period.' },
      { label: 'New Listings',         minKey: 'new_listings_min',  maxKey: 'new_listings_max',  rk: 'new_listings', step: 10,    fmt: fmtNum,     tip: 'Number of new listings added in the most recent period. Rising new listings can signal increasing supply.' },
      { label: 'Inventory',            minKey: 'inventory_min',     maxKey: 'inventory_max',     rk: 'inventory',    step: 10,    fmt: fmtNum,     tip: 'Total active listings at end of period. Low inventory drives competition; high inventory gives buyers more options.' },
      { label: 'Inventory Change YoY', minKey: 'inv_yoy_min',       maxKey: 'inv_yoy_max',       rk: 'inv_yoy',      step: 0.01,  fmt: fmtPct,     tip: 'Year-over-year % change in inventory. Rising inventory tends to cool price growth.' },
    ],
  },
];

async function fetchStates() { return (await fetch(`${API}/states`)).json(); }
async function fetchPropertyTypes() { return (await fetch(`${API}/property-types`)).json(); }

export default function FilterPanel({ onApply }) {
  const [ranges, setRanges] = useState(FALLBACK);
  const [local, setLocal] = useState(() => makeDefaultLocal(FALLBACK));

  const { data: states = [] }        = useQuery({ queryKey: ['states'],         queryFn: fetchStates });
  const { data: propertyTypes = [] } = useQuery({ queryKey: ['propertyTypes'],  queryFn: fetchPropertyTypes });

  const { data: rangesApi } = useQuery({
    queryKey: ['ranges', local.region_type],
    queryFn: async () => (await fetch(`${API}/ranges?region_type=${local.region_type}`)).json(),
  });

  useEffect(() => {
    if (!rangesApi) return;
    const nr = buildRanges(rangesApi);
    setRanges(nr);
    setLocal(prev => ({
      ...prev,
      price_min: nr.price.min,               price_max: nr.price.max,
      price_yoy_min: nr.price_yoy.min,       price_yoy_max: nr.price_yoy.max,
      ppsf_min: nr.ppsf.min,                 ppsf_max: nr.ppsf.max,
      dom_min: nr.dom.min,                   dom_max: nr.dom.max,
      mos_min: nr.mos.min,                   mos_max: nr.mos.max,
      stl_min: nr.stl.min,                   stl_max: nr.stl.max,
      sal_min: nr.sal.min,                   sal_max: nr.sal.max,
      homes_sold_min: nr.homes_sold.min,     homes_sold_max: nr.homes_sold.max,
      new_listings_min: nr.new_listings.min, new_listings_max: nr.new_listings.max,
      inventory_min: nr.inventory.min,       inventory_max: nr.inventory.max,
      inv_yoy_min: nr.inv_yoy.min,           inv_yoy_max: nr.inv_yoy.max,
      price_drops_min: nr.price_drops.min,   price_drops_max: nr.price_drops.max,
    }));
  }, [rangesApi]);

  const set = useCallback((k, v) => setLocal(prev => ({ ...prev, [k]: v })), []);

  function handleApply() { onApply(toApplied(local, ranges)); }

  function handleReset() {
    const def = makeDefaultLocal(ranges, local.region_type);
    setLocal(def);
    onApply(toApplied(def, ranges));
  }

  function handleLoadPreset(filters) { setLocal(prev => ({ ...prev, ...filters })); }

  const activeCount = (() => {
    let n = 0;
    if (local.state_codes)   n++;
    if (local.property_type) n++;
    if (local.market_type)   n++;
    if (local.region_search) n++;
    for (const sec of SLIDER_SECTIONS) for (const sl of sec.sliders) {
      if (local[sl.minKey] !== ranges[sl.rk].min) n++;
      if (local[sl.maxKey] !== ranges[sl.rk].max) n++;
    }
    return n;
  })();

  const selectedStates = local.state_codes ? local.state_codes.split(',').filter(Boolean) : [];

  function toggleState(code) {
    const s = new Set(selectedStates);
    s.has(code) ? s.delete(code) : s.add(code);
    const next = Array.from(s).join(',');
    setLocal(prev => ({ ...prev, state_codes: next, region_search: next ? prev.region_search : '' }));
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 h-[calc(100vh-61px)] overflow-y-auto sticky top-[61px] flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Filters</h2>
            {activeCount > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{activeCount}</span>
            )}
          </div>
          <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
            <RotateCcw size={11} /> Reset
          </button>
        </div>
        <button
          onClick={handleApply}
          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          <CheckCheck size={15} /> Apply Filters
        </button>
      </div>

      {/* Scrollable content */}
      <div className="p-4 space-y-5 overflow-y-auto flex-1">

        {/* Region Type */}
        <div>
          <label className="filter-label">Region Type<InfoTip text="Choose the geographic level to screen: Metro Areas, Counties, Cities, ZIP Codes, or States." /></label>
          <div className="flex flex-col gap-1.5">
            {REGION_TYPES.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" name="region_type" value={value}
                  checked={local.region_type === value} onChange={() => set('region_type', value)}
                  className="accent-blue-600" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Market Type */}
        <div>
          <label className="filter-label">Market Type<InfoTip text="Seller's = under 3 months of supply (high demand). Buyer's = over 6 months (excess inventory). Balanced = 3–6 months." /></label>
          <div className="flex flex-col gap-1.5">
            {MARKET_TYPES.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" name="market_type" value={value}
                  checked={local.market_type === value} onChange={() => set('market_type', value)}
                  className="accent-blue-600" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Property Type */}
        {propertyTypes.length > 0 && (
          <div>
            <label className="filter-label">Property Type<InfoTip text="Filter by property category: Single Family, Condo/Co-op, Townhouse, Multi-Family, or All Residential." /></label>
            <select value={local.property_type} onChange={e => set('property_type', e.target.value)} className="filter-input">
              <option value="">All Types</option>
              {propertyTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>
        )}

        {/* States */}
        <div>
          <label className="filter-label">
            State<InfoTip text="Select one or more states to focus on. Multiple selections show markets across all selected states." />
            {selectedStates.length > 0 && <span className="ml-1 font-bold text-blue-600">({selectedStates.length})</span>}
          </label>
          {states.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Fetch data first</p>
          ) : (
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-1 space-y-0.5">
              {states.map(s => (
                <label key={s.state_code} className="flex items-center gap-2 px-1 py-0.5 hover:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={selectedStates.includes(s.state_code)}
                    onChange={() => toggleState(s.state_code)} className="accent-blue-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-700">{s.state_code}</span>
                </label>
              ))}
            </div>
          )}
          {selectedStates.length > 0 && (
            <button onClick={() => setLocal(prev => ({ ...prev, state_codes: '', region_search: '' }))} className="text-xs text-red-400 hover:text-red-600 mt-1">Clear all</button>
          )}
        </div>

        {/* Region search — shown once a state is selected */}
        {selectedStates.length > 0 && (
          <div>
            <label className="filter-label">Search {local.region_type === 'metro' ? 'Metro' : local.region_type === 'county' ? 'County' : local.region_type === 'city' ? 'City' : local.region_type === 'zip' ? 'ZIP' : 'Region'}<InfoTip text="Type a partial name to find a specific market within your selected states." /></label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={local.region_search}
                onChange={e => set('region_search', e.target.value)}
                placeholder={`Filter by name…`}
                className="filter-input pl-7"
              />
            </div>
            {local.region_search && (
              <button onClick={() => set('region_search', '')} className="text-xs text-red-400 hover:text-red-600 mt-1">Clear</button>
            )}
          </div>
        )}

        {/* Numeric slider sections */}
        {SLIDER_SECTIONS.map(section => (
          <div key={section.title}>
            <hr className="border-gray-100 mb-4" />
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">{section.title}</p>
            <div className="space-y-6">
              {section.sliders.map(sl => (
                <div key={sl.minKey}>
                  <label className="filter-label">{sl.label}{sl.tip && <InfoTip text={sl.tip} />}</label>
                  {sl.note && <p className="text-xs text-gray-400 italic -mt-1 mb-1.5">{sl.note}</p>}
                  <DualRangeSlider
                    min={ranges[sl.rk].min} max={ranges[sl.rk].max}
                    minVal={local[sl.minKey]} maxVal={local[sl.maxKey]}
                    onMinChange={v => set(sl.minKey, v)} onMaxChange={v => set(sl.maxKey, v)}
                    step={sl.step} format={sl.fmt}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Saved Presets */}
        <div>
          <hr className="border-gray-100 mb-4" />
          <PresetManager currentFilters={local} onLoad={handleLoadPreset} />
        </div>

        <div className="pb-6" />
      </div>
    </aside>
  );
}

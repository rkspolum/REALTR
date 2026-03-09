import { X } from 'lucide-react';

const FILTER_GUIDE = [
  {
    section: 'Location Filters',
    items: [
      { name: 'Region Type', desc: 'Choose the geographic level to screen: Metro Areas (MSAs), Counties, Cities, or States.' },
      { name: 'Market Type', desc: "Pre-filters by supply balance. Seller's = under 3 months of supply (high demand). Buyer's = over 6 months (excess inventory). Balanced = 3–6 months." },
      { name: 'Property Type', desc: 'Filter by property category: Single Family Residential, Condo/Co-op, Townhouse, Multi-Family, or All Residential.' },
      { name: 'State', desc: 'Select one or more states to focus on. Checking multiple states shows markets across all selected states.' },
      { name: 'Region Search', desc: 'Appears after selecting a state. Type a partial name to find a specific city, county, or metro within your selected states.' },
    ],
  },
  {
    section: 'Price Filters',
    items: [
      { name: 'Median Sale Price', desc: 'The midpoint sale price — half of homes sold for more, half for less. Use this to target affordable or luxury markets.' },
      { name: 'Price Change YoY', desc: 'Year-over-year % change in median sale price. Positive = appreciation, negative = depreciation.' },
      { name: 'Median $/SqFt', desc: 'Median price per square foot of sold homes. Useful for comparing value across markets of different home sizes.' },
      { name: 'Price Drop %', desc: 'Percentage of active listings that have had at least one price reduction. High values signal softening demand or overpriced listings.' },
    ],
  },
  {
    section: 'Market Condition Filters',
    items: [
      { name: 'Days on Market', desc: 'Median days from listing to accepted offer. Low DOM (under 20) = hot market. High DOM (60+) = slow market with more negotiating power for buyers.' },
      { name: 'Months of Supply', desc: 'Estimated months to sell all current inventory at the current sales pace. Under 3 = seller\'s market. 3–6 = balanced. Over 6 = buyer\'s market.' },
      { name: 'Sale-to-List Ratio', desc: 'Average ratio of final sale price to list price. Over 100% means homes are closing above asking — a sign of bidding wars. Under 100% means buyers have leverage.' },
      { name: '% Sold Above List', desc: 'Percentage of homes that sold for more than their list price. A high percentage signals a competitive, supply-constrained market.' },
    ],
  },
  {
    section: 'Volume & Inventory Filters',
    items: [
      { name: 'Homes Sold', desc: 'Total number of homes sold in the most recent data period. Low volume can signal illiquidity or a slow market.' },
      { name: 'New Listings', desc: 'Number of new listings added in the most recent period. Rising new listings can indicate sellers entering the market or increased supply.' },
      { name: 'Inventory', desc: 'Total active listings at end of period. Low inventory drives competition; high inventory gives buyers more options.' },
      { name: 'Inventory Change YoY', desc: 'Year-over-year % change in total inventory. Rising inventory may soften prices; falling inventory may push prices up.' },
    ],
  },
];

const COLUMN_GUIDE = [
  { name: 'Market Tag', desc: "Color-coded badge: Orange = Seller's market (<3 mo supply), Gray = Balanced (3–6 mo), Blue = Buyer's market (>6 mo)." },
  { name: 'Region', desc: 'Name of the market (city, county, metro area, or state).' },
  { name: 'State', desc: 'Two-letter state abbreviation.' },
  { name: 'Type', desc: 'Property type abbreviation: SFR = Single Family, Condo, TH = Townhouse, Multi = Multi-Family, All = All Residential.' },
  { name: 'Median Price', desc: 'Median sale price for the most recent data period.' },
  { name: 'Price YoY', desc: 'Year-over-year % change in median sale price. Green = appreciation, Red = depreciation.' },
  { name: '$/SqFt', desc: 'Median price per square foot for sold homes.' },
  { name: 'List Price', desc: 'Median list (asking) price. Compare to Median Sale Price to gauge how close homes close to asking.' },
  { name: 'DOM', desc: 'Median days on market. Green (≤20) = fast market. Red (≥60) = slow market.' },
  { name: 'MoS', desc: 'Months of supply. Orange (≤3) = seller\'s market. Blue (≥6) = buyer\'s market.' },
  { name: 'Sale/List', desc: 'Average sale-to-list ratio. Over 100% = homes closing above asking price.' },
  { name: '% > List', desc: 'Percentage of homes that sold above list price.' },
  { name: 'Homes Sold', desc: 'Count of homes sold in the most recent data period.' },
  { name: 'Sold YoY', desc: 'Year-over-year % change in homes sold. Declining sales volume can precede price changes.' },
  { name: 'New Listings', desc: 'Count of new listings added in the most recent period.' },
  { name: 'Inventory', desc: 'Total active listings at the end of the data period.' },
  { name: 'Inv. YoY', desc: 'Year-over-year % change in inventory. Rising inventory tends to cool price growth.' },
  { name: '% Price Drop', desc: 'Percentage of active listings with at least one price reduction.' },
  { name: 'Off Mkt <2wk', desc: 'Percentage of homes that went off market within two weeks of listing — a strong signal of demand intensity.' },
  { name: 'Period', desc: 'The month/year of the most recent data available for this market.' },
];

export default function AboutModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">About REALTR</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Filter & column reference guide</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* About blurb */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">What is REALTR?</h3>
            <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
              REALTR is a real estate market screener powered by <span className="font-semibold">Redfin's public housing data</span>. It lets you analyze and compare U.S. housing markets across cities, counties, metros, and states — all in one place.
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
              Use the <span className="font-semibold">filters</span> on the left to narrow markets by price, supply conditions, volume, and more. Click any row in the table to see a <span className="font-semibold">detail page</span> with all metrics and historical trend charts. Save your filter combinations as <span className="font-semibold">presets</span> to revisit them later. Data updates automatically every Wednesday and Saturday.
            </p>
          </div>

          {/* Filter guide */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Filter Guide</h3>
            <div className="space-y-4">
              {FILTER_GUIDE.map(({ section, items }) => (
                <div key={section}>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{section}</p>
                  <div className="space-y-2">
                    {items.map(({ name, desc }) => (
                      <div key={name} className="flex gap-3">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-36 flex-shrink-0 pt-0.5">{name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column guide */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Table Column Guide</h3>
            <div className="space-y-2">
              {COLUMN_GUIDE.map(({ name, desc }) => (
                <div key={name} className="flex gap-3">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-28 flex-shrink-0 pt-0.5">{name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pb-2" />
        </div>
      </div>
    </div>
  );
}

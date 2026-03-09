export function getMarketType(mos) {
  if (mos == null) return null;
  if (mos < 3) return 'sellers';
  if (mos > 6) return 'buyers';
  return 'balanced';
}

const CONFIG = {
  sellers:  { label: "Seller's Market", bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  balanced: { label: 'Balanced Market',  bg: 'bg-gray-100 dark:bg-gray-700',       text: 'text-gray-600 dark:text-gray-300',    dot: 'bg-gray-400 dark:bg-gray-500' },
  buyers:   { label: "Buyer's Market",   bg: 'bg-blue-100 dark:bg-blue-900/40',     text: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500' },
};

export default function MarketTag({ mos, size = 'sm' }) {
  const type = getMarketType(mos);
  if (!type) return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
  const c = CONFIG[type];
  const px = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${px} ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

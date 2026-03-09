import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getDb, queryMarketData, getStatus, getStates, getPropertyTypes,
  getRanges, getHistory, getDashboardData,
} from './db.js';
import { fetchRegionData, fetchStatus } from './fetcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
getDb(); // init on startup

// ── Serve built frontend in production ──────────────────────────────────────
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

const VALID_TYPES = ['metro', 'county', 'city', 'zip', 'state'];
const AUTO_FETCH_TYPES = ['metro', 'county', 'zip', 'state'];

// ── Market data screener ────────────────────────────────────────────────────
app.get('/api/market-data', (req, res) => {
  try {
    const filters = { ...req.query };
    if (filters.state_codes) {
      filters.state_codes = filters.state_codes.split(',').map(s => s.trim()).filter(Boolean);
    }
    res.json(queryMarketData(filters));
  } catch (err) {
    console.error('/api/market-data error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── 12-month history for a specific market ──────────────────────────────────
app.get('/api/history', (req, res) => {
  try {
    const { region_type, region, state_code, property_type } = req.query;
    if (!region_type || !region) return res.status(400).json({ error: 'region_type and region required' });
    res.json(getHistory(region_type, region, state_code || '', property_type || 'All Residential'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard: top 10 market lists ─────────────────────────────────────────
app.get('/api/dashboard', (req, res) => {
  try {
    const { region_type = 'metro', state_codes = '', property_type = '' } = req.query;
    const stateCodes = state_codes ? state_codes.split(',').map(s => s.trim()).filter(Boolean) : [];
    res.json(getDashboardData(region_type, stateCodes, property_type));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Slider ranges (min/max per column) ─────────────────────────────────────
app.get('/api/ranges', (req, res) => {
  try {
    res.json(getRanges(req.query.region_type || null));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Status ──────────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  try {
    res.json({ dbStatus: getStatus(), fetchProgress: { ...fetchStatus } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reference data ──────────────────────────────────────────────────────────
app.get('/api/states', (req, res) => {
  try { res.json(getStates()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/property-types', (req, res) => {
  try { res.json(getPropertyTypes()); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Manual refresh trigger ──────────────────────────────────────────────────
app.post('/api/refresh', async (req, res) => {
  const { region_type } = req.body;
  const toFetch = region_type ? [region_type] : ['metro', 'county', 'city'];

  for (const t of toFetch) {
    if (!VALID_TYPES.includes(t)) return res.status(400).json({ error: `Invalid region_type: ${t}` });
    const s = fetchStatus[t];
    if (s?.state === 'downloading' || s?.state === 'parsing' || s?.state === 'inserting' || s?.state === 'indexing') {
      return res.status(409).json({ error: `Fetch already in progress for ${t}` });
    }
  }

  for (const t of toFetch) {
    fetchRegionData(t).catch(err => console.error(`[cron] Fetch failed for ${t}:`, err.message));
  }
  res.json({ message: `Refresh started for: ${toFetch.join(', ')}`, types: toFetch });
});

// ── Summary stats ───────────────────────────────────────────────────────────
app.get('/api/summary', (req, res) => {
  try {
    const db = getDb();
    const filters = { ...req.query };
    if (filters.state_codes) filters.state_codes = filters.state_codes.split(',').filter(Boolean);

    const conditions = ['is_latest = 1', 'median_sale_price IS NOT NULL'];
    const params = [];
    if (filters.region_type)    { conditions.push('region_type = ?');    params.push(filters.region_type); }
    if (filters.property_type)  { conditions.push('property_type = ?');   params.push(filters.property_type); }
    if (filters.state_codes?.length) {
      conditions.push(`state_code IN (${filters.state_codes.map(() => '?').join(',')})`);
      params.push(...filters.state_codes);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    res.json(db.prepare(`
      SELECT
        COUNT(*) as total_markets,
        ROUND(AVG(median_sale_price), 0) as avg_median_price,
        ROUND(AVG(median_sale_price_yoy) * 100, 2) as avg_price_yoy_pct,
        ROUND(AVG(median_dom), 1) as avg_dom,
        ROUND(AVG(months_of_supply), 2) as avg_mos,
        ROUND(AVG(avg_sale_to_list) * 100, 2) as avg_sale_to_list_pct,
        MAX(period_end) as latest_period
      FROM market_data ${where}
    `).get(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Auto-refresh helpers ─────────────────────────────────────────────────────
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 1 day — fetch on startup if data is older than this

function isInProgress(type) {
  const s = fetchStatus[type]?.state;
  return s === 'downloading' || s === 'parsing' || s === 'inserting' || s === 'indexing';
}

async function runRefreshForTypes(label, types) {
  console.log(`[refresh] Starting (${label}) for: ${types.join(', ')}`);
  for (const type of types) {
    if (isInProgress(type)) { console.log(`[refresh] ${type} already in progress, skipping`); continue; }
    try { await fetchRegionData(type); } catch (err) { console.error(`[refresh] ${type} failed:`, err.message); }
  }
  console.log(`[refresh] Done (${label})`);
}

// On startup: fetch any region type that is missing or stale (> 3 days old)
async function startupRefresh() {
  const status = getStatus();
  const now = Date.now();
  const staleTypes = AUTO_FETCH_TYPES.filter(type => {
    if (isInProgress(type)) return false;
    const row = status.find(r => r.region_type === type);
    if (!row) return true; // no data at all
    const age = now - new Date(row.fetched_at).getTime();
    return age > STALE_THRESHOLD_MS;
  });
  if (staleTypes.length === 0) {
    console.log('[startup] All region data is up-to-date.');
    return;
  }
  console.log(`[startup] Auto-fetching stale/missing types: ${staleTypes.join(', ')}`);
  // Fire in background so server is immediately responsive
  runRefreshForTypes('startup', staleTypes).catch(err => console.error('[startup] Error:', err.message));
}

// Scheduled refresh: Wednesday & Saturday at 3 AM (city excluded)
cron.schedule('0 3 * * 6', () => runRefreshForTypes('Saturday', AUTO_FETCH_TYPES));
cron.schedule('0 3 * * 3', () => runRefreshForTypes('Wednesday', AUTO_FETCH_TYPES));

// ── Catch-all: serve frontend for any non-API route ─────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Redfin Screener backend → http://localhost:${PORT}`);
  console.log('Auto-refresh: on startup (if stale) + Wednesdays & Saturdays at 3:00 AM.');
  startupRefresh();
});

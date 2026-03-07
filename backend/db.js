import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'market_data.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region_type TEXT NOT NULL,
      region TEXT NOT NULL,
      city TEXT,
      state TEXT,
      state_code TEXT,
      property_type TEXT,
      period_begin TEXT,
      period_end TEXT,
      is_latest INTEGER DEFAULT 0,
      median_sale_price REAL,
      median_sale_price_mom REAL,
      median_sale_price_yoy REAL,
      median_list_price REAL,
      median_list_price_yoy REAL,
      median_ppsf REAL,
      median_ppsf_yoy REAL,
      homes_sold REAL,
      homes_sold_yoy REAL,
      new_listings REAL,
      new_listings_yoy REAL,
      inventory REAL,
      inventory_yoy REAL,
      months_of_supply REAL,
      months_of_supply_yoy REAL,
      median_dom REAL,
      median_dom_yoy REAL,
      avg_sale_to_list REAL,
      avg_sale_to_list_yoy REAL,
      sold_above_list REAL,
      price_drops REAL,
      off_market_in_two_weeks REAL,
      parent_metro_region TEXT,
      last_updated TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_region_type    ON market_data(region_type);
    CREATE INDEX IF NOT EXISTS idx_state_code     ON market_data(state_code);
    CREATE INDEX IF NOT EXISTS idx_property_type  ON market_data(property_type);
    CREATE INDEX IF NOT EXISTS idx_period_end     ON market_data(period_end);
    CREATE INDEX IF NOT EXISTS idx_region_period  ON market_data(region_type, region, state_code, property_type, period_end);

    CREATE TABLE IF NOT EXISTS data_status (
      id INTEGER PRIMARY KEY,
      region_type TEXT UNIQUE,
      period_end TEXT,
      row_count INTEGER,
      fetched_at TEXT
    );
  `);

  // Migration: add is_latest column to existing tables that don't have it
  try {
    db.exec('ALTER TABLE market_data ADD COLUMN is_latest INTEGER DEFAULT 0');
    // Newly added: migrate existing single-period rows to is_latest = 1
    const types = db.prepare('SELECT DISTINCT region_type FROM market_data').all();
    for (const { region_type } of types) {
      _updateLatestFlags(region_type);
    }
  } catch {
    // Column already exists — no migration needed
  }

  // Create is_latest index after ensuring column exists
  db.exec('CREATE INDEX IF NOT EXISTS idx_is_latest ON market_data(is_latest, region_type)');
}

// ── Internal: mark the most recent period per (region, state_code, property_type) ──
function _updateLatestFlags(regionType) {
  db.prepare('UPDATE market_data SET is_latest = 0 WHERE region_type = ?').run(regionType);

  const groups = db.prepare(`
    SELECT region, state_code, property_type, MAX(period_end) AS max_period
    FROM market_data WHERE region_type = ?
    GROUP BY region, state_code, property_type
  `).all(regionType);

  const stmt = db.prepare(`
    UPDATE market_data SET is_latest = 1
    WHERE region_type = ? AND region = ? AND state_code = ? AND property_type = ? AND period_end = ?
  `);
  db.transaction(gs => { for (const g of gs) stmt.run(regionType, g.region, g.state_code, g.property_type, g.max_period); })(groups);
}

export function updateLatestFlags(regionType) { _updateLatestFlags(regionType); }

// ── Write operations ──────────────────────────────────────────────────────────

export function clearDataForType(regionType) {
  db.prepare('DELETE FROM market_data WHERE region_type = ?').run(regionType);
  db.prepare('DELETE FROM data_status WHERE region_type = ?').run(regionType);
}

export function bulkInsert(rows) {
  if (rows.length === 0) return;
  const insert = db.prepare(`
    INSERT INTO market_data (
      region_type, region, city, state, state_code, property_type,
      period_begin, period_end,
      median_sale_price, median_sale_price_mom, median_sale_price_yoy,
      median_list_price, median_list_price_yoy,
      median_ppsf, median_ppsf_yoy,
      homes_sold, homes_sold_yoy,
      new_listings, new_listings_yoy,
      inventory, inventory_yoy,
      months_of_supply, months_of_supply_yoy,
      median_dom, median_dom_yoy,
      avg_sale_to_list, avg_sale_to_list_yoy,
      sold_above_list, price_drops, off_market_in_two_weeks,
      parent_metro_region, last_updated
    ) VALUES (
      @region_type, @region, @city, @state, @state_code, @property_type,
      @period_begin, @period_end,
      @median_sale_price, @median_sale_price_mom, @median_sale_price_yoy,
      @median_list_price, @median_list_price_yoy,
      @median_ppsf, @median_ppsf_yoy,
      @homes_sold, @homes_sold_yoy,
      @new_listings, @new_listings_yoy,
      @inventory, @inventory_yoy,
      @months_of_supply, @months_of_supply_yoy,
      @median_dom, @median_dom_yoy,
      @avg_sale_to_list, @avg_sale_to_list_yoy,
      @sold_above_list, @price_drops, @off_market_in_two_weeks,
      @parent_metro_region, @last_updated
    )
  `);
  db.transaction(rs => { for (const r of rs) insert.run(r); })(rows);
}

export function upsertStatus(regionType, periodEnd, rowCount) {
  db.prepare(`
    INSERT INTO data_status (region_type, period_end, row_count, fetched_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(region_type) DO UPDATE SET
      period_end = excluded.period_end,
      row_count = excluded.row_count,
      fetched_at = excluded.fetched_at
  `).run(regionType, periodEnd, rowCount, new Date().toISOString());
}

// ── Read operations ───────────────────────────────────────────────────────────

export function getStatus() {
  return db.prepare('SELECT * FROM data_status ORDER BY fetched_at DESC').all();
}

export function getMaxPeriod(regionType) {
  const row = db.prepare('SELECT MAX(period_end) as p FROM market_data WHERE region_type = ?').get(regionType);
  return row?.p || '';
}

export function getStates() {
  return db.prepare(`
    SELECT DISTINCT state_code FROM market_data
    WHERE is_latest = 1 AND state_code IS NOT NULL AND state_code != ''
    ORDER BY state_code
  `).all();
}

export function getPropertyTypes() {
  return db.prepare(`
    SELECT DISTINCT property_type FROM market_data
    WHERE is_latest = 1 AND property_type IS NOT NULL
    ORDER BY property_type
  `).all().map(r => r.property_type);
}

export function getRanges(regionType) {
  const condition = regionType
    ? 'WHERE is_latest = 1 AND region_type = ? AND median_sale_price IS NOT NULL'
    : 'WHERE is_latest = 1 AND median_sale_price IS NOT NULL';
  const params = regionType ? [regionType] : [];
  return db.prepare(`
    SELECT
      MIN(median_sale_price)     as price_min,     MAX(median_sale_price)     as price_max,
      MIN(median_sale_price_yoy) as price_yoy_min,  MAX(median_sale_price_yoy) as price_yoy_max,
      MIN(median_ppsf)           as ppsf_min,        MAX(median_ppsf)           as ppsf_max,
      MIN(median_dom)            as dom_min,          MAX(median_dom)            as dom_max,
      MIN(months_of_supply)      as mos_min,          MAX(months_of_supply)      as mos_max,
      MIN(avg_sale_to_list)      as stl_min,          MAX(avg_sale_to_list)      as stl_max,
      MIN(sold_above_list)       as sal_min,          MAX(sold_above_list)       as sal_max,
      MIN(homes_sold)            as homes_sold_min,   MAX(homes_sold)            as homes_sold_max,
      MIN(new_listings)          as new_listings_min, MAX(new_listings)          as new_listings_max,
      MIN(inventory)             as inventory_min,    MAX(inventory)             as inventory_max,
      MIN(inventory_yoy)         as inv_yoy_min,      MAX(inventory_yoy)         as inv_yoy_max,
      MIN(price_drops)           as price_drops_min,  MAX(price_drops)           as price_drops_max
    FROM market_data ${condition}
  `).get(...params);
}

export function queryMarketData(filters = {}) {
  const conditions = ['is_latest = 1', 'median_sale_price IS NOT NULL'];
  const params = [];

  if (filters.region_type) { conditions.push('region_type = ?'); params.push(filters.region_type); }
  if (filters.state_codes?.length > 0) {
    conditions.push(`state_code IN (${filters.state_codes.map(() => '?').join(',')})`);
    params.push(...filters.state_codes);
  }
  if (filters.property_type) { conditions.push('property_type = ?'); params.push(filters.property_type); }
  if (filters.region_search) { conditions.push('region LIKE ?'); params.push(`%${filters.region_search}%`); }

  // Market type tag filter
  if (filters.market_type === 'buyers')   { conditions.push('months_of_supply > 6'); }
  else if (filters.market_type === 'sellers')  { conditions.push('months_of_supply < 3'); }
  else if (filters.market_type === 'balanced') { conditions.push('months_of_supply >= 3'); conditions.push('months_of_supply <= 6'); }

  // Numeric range filters
  const numericFilters = [
    ['median_sale_price',     'min_price',        'max_price'],
    ['median_sale_price_yoy', 'min_price_yoy',    'max_price_yoy'],
    ['median_ppsf',           'min_ppsf',         'max_ppsf'],
    ['median_dom',            'min_dom',          'max_dom'],
    ['months_of_supply',      'min_mos',          'max_mos'],
    ['homes_sold',            'min_homes_sold',   'max_homes_sold'],
    ['new_listings',          'min_new_listings', 'max_new_listings'],
    ['inventory',             'min_inventory',    'max_inventory'],
    ['inventory_yoy',         'min_inv_yoy',      'max_inv_yoy'],
    ['avg_sale_to_list',      'min_stl',          'max_stl'],
    ['sold_above_list',       'min_sal',          'max_sal'],
    ['price_drops',           'min_price_drops',  'max_price_drops'],
  ];
  for (const [col, minKey, maxKey] of numericFilters) {
    if (filters[minKey] !== undefined && filters[minKey] !== '') { conditions.push(`${col} >= ?`); params.push(Number(filters[minKey])); }
    if (filters[maxKey] !== undefined && filters[maxKey] !== '') { conditions.push(`${col} <= ?`); params.push(Number(filters[maxKey])); }
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit  = Math.min(Number(filters.limit  || 100), 100000);
  const offset = Number(filters.offset || 0);

  const allowedSortCols = [
    'region', 'state_code', 'median_sale_price', 'median_sale_price_yoy',
    'median_ppsf', 'median_dom', 'months_of_supply', 'homes_sold',
    'new_listings', 'inventory', 'inventory_yoy', 'avg_sale_to_list',
    'sold_above_list', 'price_drops', 'off_market_in_two_weeks', 'median_list_price',
  ];
  const safeSort = allowedSortCols.includes(filters.sort_col) ? filters.sort_col : 'median_sale_price';
  const sortDir  = filters.sort_dir === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`SELECT COUNT(*) as n FROM market_data ${where}`).get(...params).n;
  const rows  = db.prepare(`SELECT * FROM market_data ${where} ORDER BY ${safeSort} ${sortDir} LIMIT ? OFFSET ?`).all(...params, limit, offset);

  return { total, rows };
}

export function getHistory(regionType, region, stateCode, propertyType) {
  return db.prepare(`
    SELECT
      period_end, period_begin,
      median_sale_price, median_ppsf, median_dom, months_of_supply,
      inventory, homes_sold, new_listings, avg_sale_to_list,
      sold_above_list, price_drops, median_sale_price_yoy, inventory_yoy
    FROM market_data
    WHERE region_type = ? AND region = ? AND state_code = ? AND property_type = ?
    ORDER BY period_end ASC
  `).all(regionType, region, stateCode, propertyType);
}

export function getDashboardData(regionType = 'metro', stateCodes = [], propertyType = '') {
  const extraConditions = [];
  const extraParams = [];

  if (stateCodes.length > 0) {
    extraConditions.push(`state_code IN (${stateCodes.map(() => '?').join(',')})`);
    extraParams.push(...stateCodes);
  }

  const propType = propertyType || 'All Residential';
  extraConditions.push(`property_type = ?`);
  extraParams.push(propType);

  const extra = extraConditions.length ? ' AND ' + extraConditions.join(' AND ') : '';
  const base = `FROM market_data WHERE is_latest = 1 AND region_type = ? AND median_sale_price IS NOT NULL${extra}`;
  const p = [regionType, ...extraParams];

  return {
    buyersMarkets: db.prepare(
      `SELECT * ${base} AND months_of_supply IS NOT NULL ORDER BY months_of_supply DESC LIMIT 10`
    ).all(...p),

    sellersMarkets: db.prepare(
      `SELECT * ${base} AND months_of_supply IS NOT NULL AND months_of_supply > 0 ORDER BY months_of_supply ASC LIMIT 10`
    ).all(...p),

    affordable: db.prepare(
      `SELECT * ${base} AND median_sale_price < 250000 AND homes_sold >= 10 ORDER BY median_sale_price ASC LIMIT 10`
    ).all(...p),

    appreciating: db.prepare(
      `SELECT * ${base} AND avg_sale_to_list IS NOT NULL AND homes_sold >= 10 ORDER BY avg_sale_to_list DESC LIMIT 10`
    ).all(...p),
  };
}

import axios from 'axios';
import zlib from 'zlib';
import readline from 'readline';
import { bulkInsert, pruneOldData, upsertStatus, updateLatestFlags, getMaxPeriod } from './db.js';

const REDFIN_URLS = {
  metro:  'https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/redfin_metro_market_tracker.tsv000.gz',
  county: 'https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/county_market_tracker.tsv000.gz',
  city:   'https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/city_market_tracker.tsv000.gz',
  state:  'https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/state_market_tracker.tsv000.gz',
};

export const fetchStatus = {};

// Only keep the past 20 years (user preference)
const CUTOFF_DATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 20);
  return d.toISOString().slice(0, 10);
})();

// Keep 24 months of history per region for trend charts
const HISTORY_CUTOFF = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 24);
  return d.toISOString().slice(0, 10);
})();

const BATCH_SIZE = 5000;

function stripQuotes(s) {
  if (typeof s !== 'string') return s;
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}

function parseNum(val) {
  const s = stripQuotes(val);
  if (!s || s === 'null' || s === 'N/A') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function parseStr(val) { return stripQuotes(val ?? ''); }

function mapRow(headers, values, regionType) {
  const r = {};
  headers.forEach((h, i) => { r[h] = values[i] ?? ''; });
  return {
    region_type: regionType,
    region:      parseStr(r['region'] || r['city']),
    city:        parseStr(r['city']),
    state:       parseStr(r['state']),
    state_code:  parseStr(r['state_code']),
    property_type: parseStr(r['property_type']),
    period_begin:  parseStr(r['period_begin']),
    period_end:    parseStr(r['period_end']),
    median_sale_price:     parseNum(r['median_sale_price']),
    median_sale_price_mom: parseNum(r['median_sale_price_mom']),
    median_sale_price_yoy: parseNum(r['median_sale_price_yoy']),
    median_list_price:     parseNum(r['median_list_price']),
    median_list_price_yoy: parseNum(r['median_list_price_yoy']),
    median_ppsf:           parseNum(r['median_ppsf']),
    median_ppsf_yoy:       parseNum(r['median_ppsf_yoy']),
    homes_sold:            parseNum(r['homes_sold']),
    homes_sold_yoy:        parseNum(r['homes_sold_yoy']),
    new_listings:          parseNum(r['new_listings']),
    new_listings_yoy:      parseNum(r['new_listings_yoy']),
    inventory:             parseNum(r['inventory']),
    inventory_yoy:         parseNum(r['inventory_yoy']),
    months_of_supply:      parseNum(r['months_of_supply']),
    months_of_supply_yoy:  parseNum(r['months_of_supply_yoy']),
    median_dom:            parseNum(r['median_dom']),
    median_dom_yoy:        parseNum(r['median_dom_yoy']),
    avg_sale_to_list:      parseNum(r['avg_sale_to_list']),
    avg_sale_to_list_yoy:  parseNum(r['avg_sale_to_list_yoy']),
    sold_above_list:       parseNum(r['sold_above_list']),
    price_drops:           parseNum(r['price_drops']),
    off_market_in_two_weeks: parseNum(r['off_market_in_two_weeks']),
    parent_metro_region:   parseStr(r['parent_metro_region']),
    last_updated:          parseStr(r['last_updated']),
  };
}

export async function fetchRegionData(regionType) {
  const url = REDFIN_URLS[regionType];
  if (!url) throw new Error(`Unknown region type: ${regionType}`);

  fetchStatus[regionType] = { state: 'downloading', rowsInserted: 0, startedAt: new Date().toISOString() };
  console.log(`[${regionType}] Downloading from Redfin...`);

  let response;
  try {
    response = await axios.get(url, {
      responseType: 'stream',
      timeout: 600_000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Encoding': 'gzip, deflate',
        'Referer': 'https://www.redfin.com/news/data-center/',
      },
    });
  } catch (err) {
    fetchStatus[regionType] = { state: 'error', error: err.message };
    throw err;
  }

  return new Promise((resolve, reject) => {
    fetchStatus[regionType].state = 'parsing';

    const gunzip = zlib.createGunzip();
    const rl = readline.createInterface({ input: gunzip, crlfDelay: Infinity });

    let headers = null;
    let batch = [];
    let totalInserted = 0;

    function flushBatch() {
      if (batch.length === 0) return;
      bulkInsert(batch);
      totalInserted += batch.length;
      fetchStatus[regionType].rowsInserted = totalInserted;
      batch = [];
    }

    rl.on('line', (line) => {
      if (!line.trim()) return;
      const values = line.split('\t');

      if (!headers) {
        headers = values.map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
        return;
      }

      const row = mapRow(headers, values, regionType);
      if (!row.period_end) return;
      // Skip seasonally-adjusted rows — they have null values for key metrics like price_drops
      const saIdx = headers.indexOf('is_seasonally_adjusted');
      if (saIdx >= 0 && values[saIdx]?.trim() === '1') return;
      if (row.period_end < CUTOFF_DATE) return;    // 20-year cap (user preference)
      if (row.period_end < HISTORY_CUTOFF) return; // keep only last 13 months for trend charts

      batch.push(row);
      if (batch.length >= BATCH_SIZE) flushBatch();
    });

    rl.on('close', () => {
      try {
        flushBatch();
        fetchStatus[regionType].state = 'indexing';
        console.log(`[${regionType}] ${totalInserted} rows inserted. Updating latest flags...`);

        updateLatestFlags(regionType);

        const maxPeriod = getMaxPeriod(regionType);
        upsertStatus(regionType, maxPeriod, totalInserted);
        pruneOldData(regionType);

        fetchStatus[regionType] = {
          state: 'done',
          rowsInserted: totalInserted,
          period_end: maxPeriod,
          completedAt: new Date().toISOString(),
        };
        console.log(`[${regionType}] Complete. Latest period: ${maxPeriod}`);
        resolve({ rowCount: totalInserted, period_end: maxPeriod });
      } catch (err) {
        fetchStatus[regionType] = { state: 'error', error: err.message };
        reject(err);
      }
    });

    rl.on('error', (err) => { fetchStatus[regionType] = { state: 'error', error: err.message }; reject(err); });
    response.data.on('error', (err) => { fetchStatus[regionType] = { state: 'error', error: err.message }; reject(err); });
    response.data.pipe(gunzip);
  });
}

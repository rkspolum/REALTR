# Redfin Market Screener

A full-stack web application for screening U.S. housing markets using live data from Redfin's public Data Center.

## Features

- **Live Redfin Data**: Fetches directly from Redfin's public S3 data files (metro, county, city, ZIP, state)
- **Powerful Filtering**: Filter by region type, property type, state, price range, YoY changes, days on market, months of supply, sale-to-list ratio, inventory changes, and more
- **Sortable Table**: Click any column header to sort ascending/descending
- **Summary Stats**: Aggregate stats update instantly as you change filters
- **Color-coded Metrics**: Green/red indicators for price changes, fast/slow markets, buyer vs seller conditions
- **Pagination**: Handles large datasets efficiently
- **Persistent Cache**: Data is stored locally in SQLite — no re-download needed until you click "Fetch Data"

## Stack

- **Backend**: Node.js + Express + better-sqlite3
- **Frontend**: React 18 + Vite + TailwindCSS + @tanstack/react-table + @tanstack/react-query
- **Data**: Redfin public S3 TSV files (gzip-compressed, streamed and parsed)

## Setup

### Prerequisites
- Node.js 18+

### Install

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install --legacy-peer-deps
```

### Run

In two separate terminals:

```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm start

# Terminal 2 - Frontend (port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

### Load Data

1. Select a region type from the dropdown in the header (start with **Metro** — fastest download, ~1 min)
2. Click **Fetch Data** — data is downloaded from Redfin, parsed, and stored in SQLite
3. Data status chips in the header show download progress and the data period
4. Repeat for **County**, **City**, etc. as needed (City/ZIP files are large — several minutes)

> Data is cached in `backend/market_data.db`. Re-fetching overwrites existing data for that region type.

## Key Metrics Explained

| Metric | Description | Investor Signal |
|--------|-------------|-----------------|
| **Median Sale Price** | Median sold price | Market price level |
| **Price YoY** | Year-over-year price change | Appreciation trend |
| **$/SqFt** | Median price per square foot | Relative value |
| **DOM** | Median days on market | Green <20, Red >60 |
| **MoS** | Months of supply | Orange <3 (seller's), Blue >6 (buyer's) |
| **Sale/List** | Avg sale-to-list ratio | >100% = bidding wars |
| **% > List** | % of homes sold above list price | Market heat |
| **Inventory YoY** | Year-over-year inventory change | Supply trend |
| **% Price Drop** | % of active listings with price reductions | Softening signal |
| **Off Mkt <2wk** | % of homes going off-market within 2 weeks | Demand intensity |

## API Endpoints

```
GET  /api/market-data      Query market data with filters
GET  /api/status           Data freshness and fetch progress
GET  /api/states           Available states in current data
GET  /api/property-types   Available property types
GET  /api/summary          Aggregate stats for filtered data
POST /api/refresh          Trigger data fetch: {"region_type":"metro"}
```

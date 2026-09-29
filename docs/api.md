# StockSense — REST API Documentation

## Base URL
`http://localhost:5000/api`

---

## 1. Authentication Endpoints

### `POST /auth/register`
Create a new user account.
- **Body**: `{ "email": "user@example.com", "password": "password123", "first_name": "John", "last_name": "Doe", "phone": "+919876543210" }`
- **Response**: `{ "success": true, "token": "JWT...", "user": { ... } }`

### `POST /auth/login`
Authenticate user and receive JWT.
- **Body**: `{ "email": "user@example.com", "password": "password123" }`
- **Response**: `{ "success": true, "token": "JWT...", "user": { ... } }`

### `GET /auth/me` *(Protected)*
Fetch profile of currently authenticated user.

---

## 2. Stock Catalog, Search & Discovery

### `GET /stocks`
Fetch paginated stock catalog with search, sector, market cap, and sorting filters.
- **Query Parameters**:
  - `q` (string): Search symbol, company name, sector, or industry
  - `sector` (string): Filter by sector name
  - `category` (string): `Large Cap`, `Mid Cap`, or `Small Cap`
  - `page` (integer): Page number (default: 1)
  - `limit` (integer): Results per page (default: 50, max: 100)
  - `sort_by` (string): `name_asc`, `name_desc`, `symbol_asc`, `sector_asc`
- **Response**: `{ "success": true, "total": 74, "page": 1, "totalPages": 2, "stocks": [...] }`

### `GET /stocks/sectors`
List all active sectors with count of listed companies.
- **Response**: `{ "success": true, "count": 14, "sectors": [{ "sector": "Technology", "count": 9 }, ...] }`

### `GET /stocks/discovery`
Top Gainers, Top Losers, Most Active equities, and curated popular stocks.
- **Response**: `{ "success": true, "totalActive": 74, "popular": [...], "topGainers": [...], "topLosers": [...], "mostActive": [...] }`

### `GET /stocks/compare?symbols=TCS.BSE,INFY.BSE`
Side-by-side comparative analysis of 2 or more stocks.
- **Response**: `{ "success": true, "count": 2, "comparison": [{ "stock": { ... }, "market": { ... }, "performance": { ... }, "technicalIndicators": { ... }, "aiAnalysis": { ... } }, ...] }`

### `GET /stocks/:symbol/analysis`
Comprehensive stock profile, latest quote, performance periods, 13 indicators, and AI prediction.

### `GET /stocks/:symbol/history?period=1M`
OHLCV historical prices (`1W`, `1M`, `3M`, `6M`, `1Y`).

### `GET /stocks/:symbol/prediction`
Directional AI prediction (`UP`/`DOWN`), confidence score, probability, and target price.

---

## 3. Conversational Multilingual AI Assistant

### `POST /ai/chat`
Send conversational queries in English or Telugu. Supports entity extraction, stock comparison, memory, and follow-up prompt chips.
- **Body**: `{ "message": "Compare TCS and INFY", "symbol": null, "conversationHistory": [...] }`
- **Response**:
  ```json
  {
    "success": true,
    "reply": "### 📊 Comparative Analysis...",
    "symbols": ["TCS.BSE", "INFY.BSE"],
    "hasStockContext": true,
    "suggestedPrompts": ["Why is TCS predicted DOWN?", "What are the risks with INFY?", "Explain RSI difference"],
    "disclaimer": "StockSense provides educational market analysis...",
    "timestamp": "2026-09-03T10:20:00.000Z"
  }
  ```

---

## 4. Watchlist & Portfolio (Protected)

### `GET /watchlist` | `POST /watchlist` | `DELETE /watchlist/:symbol`
Manage user watchlist with live quotes and directional signals.

### `GET /portfolio` | `POST /portfolio/transaction`
Track virtual cash outlay, current valuation, unrealized P&L, return %, and log simulated trades.

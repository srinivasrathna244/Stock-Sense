# StockSense — Database Schema & Data Dictionary

## Overview
- **Engine**: MySQL 8.0 / InnoDB
- **Charset**: `utf8mb4`
- **Total Tables**: 13

---

## 1. Table Data Dictionary

### `stocks`
Stores active listed equities catalog.
- `id` (INT, PK, Auto Increment)
- `symbol` (VARCHAR(30), Unique)
- `company_name` (VARCHAR(200))
- `exchange` (VARCHAR(20))
- `country` (VARCHAR(100))
- `sector` (VARCHAR(100), Indexed)
- `industry` (VARCHAR(150))
- `market_cap_category` (VARCHAR(50), Indexed) — *Large Cap / Mid Cap / Small Cap*
- `currency` (VARCHAR(10))
- `is_active` (BOOLEAN, Indexed)
- `created_at` (TIMESTAMP)

### `stock_data_sync_status`
Tracks market data synchronization health per stock.
- `id` (INT, PK)
- `stock_id` (INT, FK -> stocks.id)
- `last_sync_date` (DATE)
- `last_success_at` (TIMESTAMP)
- `last_attempt_at` (TIMESTAMP)
- `status` (ENUM: 'SUCCESS', 'FAILED', 'PENDING', 'IN_PROGRESS')
- `error_message` (TEXT)

### `stock_prices`
Historical daily OHLCV market sessions.
- `id` (BIGINT, PK)
- `stock_id` (INT, FK -> stocks.id)
- `trading_date` (DATE)
- `open_price`, `high_price`, `low_price`, `close_price`, `adjusted_close` (DECIMAL(15,4))
- `volume` (BIGINT)
- `UNIQUE(stock_id, trading_date)`

### `technical_indicators`
Calculated indicators for all trading dates.
- `id` (BIGINT, PK)
- `stock_id` (INT, FK -> stocks.id)
- `trading_date` (DATE)
- `sma_20`, `sma_50`, `sma_200`, `ema_20`, `ema_50` (DECIMAL(15,4))
- `rsi` (DECIMAL(8,4))
- `macd`, `macd_signal`, `macd_histogram` (DECIMAL(15,6))
- `bollinger_upper`, `bollinger_middle`, `bollinger_lower` (DECIMAL(15,4))
- `volatility` (DECIMAL(10,6))
- `UNIQUE(stock_id, trading_date)`

### `predictions`
Persisted Random Forest inference logs.
- `id` (BIGINT, PK)
- `stock_id` (INT, FK -> stocks.id)
- `prediction_date` (DATE)
- `target_date` (DATE)
- `current_price`, `predicted_price`, `expected_change_percent` (DECIMAL)
- `direction` (ENUM: 'UP', 'DOWN', 'NEUTRAL')
- `confidence_score` (DECIMAL(5,2))
- `model_name` (VARCHAR(100))

### `users`
Registered user accounts.
- `id` (INT, PK)
- `email` (VARCHAR(150), Unique)
- `password_hash` (VARCHAR(255)) — *bcrypt hash (12 rounds)*
- `first_name`, `last_name` (VARCHAR(100))
- `phone` (VARCHAR(20), Unique)

### `watchlists`
User saved equities.
- `id` (INT, PK)
- `user_id` (INT, FK -> users.id)
- `stock_id` (INT, FK -> stocks.id)
- `UNIQUE(user_id, stock_id)`

### `portfolios` & `portfolio_transactions`
Virtual portfolio holdings and executed simulated trades (BUY / SELL).
- `quantity` (DECIMAL(15,4))
- `price_per_share` (DECIMAL(15,4))
- `transaction_type` (ENUM: 'BUY', 'SELL')

-- ============================================================
-- StockSense
-- AI-Powered Stock Market Analysis Platform
-- Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS stocksense;

USE stocksense;


-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),

    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),

    password_hash VARCHAR(255) NOT NULL,

    role ENUM('user', 'admin') DEFAULT 'user',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- ============================================================
-- 2. STOCKS
-- Stores basic information about supported stocks
-- ============================================================

CREATE TABLE IF NOT EXISTS stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,

    symbol VARCHAR(50) NOT NULL,
    company_name VARCHAR(200) NOT NULL,

    exchange VARCHAR(50) NOT NULL,
    country VARCHAR(100) NOT NULL,

    sector VARCHAR(150),
    industry VARCHAR(150),

    currency VARCHAR(10) DEFAULT 'INR',

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_stock_exchange (symbol, exchange)
);


-- ============================================================
-- 3. STOCK PRICES
-- Historical market price data
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_prices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    stock_id INT NOT NULL,

    trading_date DATE NOT NULL,

    open_price DECIMAL(15,4) NOT NULL,
    high_price DECIMAL(15,4) NOT NULL,
    low_price DECIMAL(15,4) NOT NULL,
    close_price DECIMAL(15,4) NOT NULL,

    adjusted_close DECIMAL(15,4),

    volume BIGINT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (stock_id)
        REFERENCES stocks(id)
        ON DELETE CASCADE,

    UNIQUE KEY unique_stock_date (stock_id, trading_date),

    INDEX idx_stock_date (stock_id, trading_date)
);


-- ============================================================
-- 4. TECHNICAL INDICATORS
-- Stores calculated technical analysis values
-- ============================================================

CREATE TABLE IF NOT EXISTS technical_indicators (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    stock_id INT NOT NULL,

    trading_date DATE NOT NULL,

    sma_20 DECIMAL(15,4),
    sma_50 DECIMAL(15,4),
    sma_200 DECIMAL(15,4),

    ema_20 DECIMAL(15,4),
    ema_50 DECIMAL(15,4),

    rsi DECIMAL(8,4),

    macd DECIMAL(15,6),
    macd_signal DECIMAL(15,6),
    macd_histogram DECIMAL(15,6),

    bollinger_upper DECIMAL(15,4),
    bollinger_middle DECIMAL(15,4),
    bollinger_lower DECIMAL(15,4),

    volatility DECIMAL(10,6),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (stock_id)
        REFERENCES stocks(id)
        ON DELETE CASCADE,

    UNIQUE KEY unique_indicator_date (stock_id, trading_date),

    INDEX idx_indicator_stock_date (stock_id, trading_date)
);


-- ============================================================
-- 5. PREDICTIONS
-- Stores AI-generated stock predictions
-- ============================================================

CREATE TABLE IF NOT EXISTS predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    stock_id INT NOT NULL,

    prediction_date DATE NOT NULL,

    target_date DATE NOT NULL,

    current_price DECIMAL(15,4) NOT NULL,

    predicted_price DECIMAL(15,4) NOT NULL,

    expected_change_percent DECIMAL(10,4),

    direction ENUM('UP', 'DOWN', 'NEUTRAL') NOT NULL,

    confidence_score DECIMAL(5,2),

    risk_score DECIMAL(5,2),

    risk_level ENUM('LOW', 'MEDIUM', 'HIGH'),

    model_name VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (stock_id)
        REFERENCES stocks(id)
        ON DELETE CASCADE,

    INDEX idx_prediction_stock_date (stock_id, prediction_date)
);


-- ============================================================
-- 6. MODEL PERFORMANCE
-- Stores machine-learning model evaluation results
-- ============================================================

CREATE TABLE IF NOT EXISTS model_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,

    model_name VARCHAR(100) NOT NULL,

    stock_id INT,

    evaluation_date DATE NOT NULL,

    mae DECIMAL(15,6),
    rmse DECIMAL(15,6),
    mape DECIMAL(10,6),

    directional_accuracy DECIMAL(6,3),

    training_samples INT,

    test_samples INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (stock_id)
        REFERENCES stocks(id)
        ON DELETE SET NULL,

    INDEX idx_model_date (model_name, evaluation_date)
);


-- ============================================================
-- 7. WATCHLISTS
-- User's favorite stocks
-- ============================================================

CREATE TABLE IF NOT EXISTS watchlists (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,
    stock_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (stock_id)
        REFERENCES stocks(id)
        ON DELETE CASCADE,

    UNIQUE KEY unique_user_stock (user_id, stock_id)
);


-- ============================================================
-- 8. PORTFOLIOS
-- Virtual investment portfolio
-- ============================================================

CREATE TABLE IF NOT EXISTS portfolios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    portfolio_name VARCHAR(150) DEFAULT 'My Portfolio',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 9. PORTFOLIO TRANSACTIONS
-- Virtual buy/sell transactions
-- ============================================================

CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    portfolio_id BIGINT NOT NULL,
    stock_id INT NOT NULL,

    transaction_type ENUM('BUY', 'SELL') NOT NULL,

    quantity DECIMAL(15,4) NOT NULL,

    price_per_share DECIMAL(15,4) NOT NULL,

    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (portfolio_id)
        REFERENCES portfolios(id)
        ON DELETE CASCADE,

    FOREIGN KEY (stock_id)
        REFERENCES stocks(id)
        ON DELETE CASCADE,

    INDEX idx_portfolio_transactions (portfolio_id, transaction_date)
);


-- ============================================================
-- 10. NEWS
-- Financial news related to stocks
-- ============================================================

CREATE TABLE IF NOT EXISTS news (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    stock_id INT,

    title VARCHAR(500) NOT NULL,

    description TEXT,

    source VARCHAR(200),

    article_url VARCHAR(1000),

    published_at DATETIME,

    sentiment ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE'),

    sentiment_score DECIMAL(6,4),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (stock_id)
        REFERENCES stocks(id)
        ON DELETE SET NULL,

    INDEX idx_news_stock_date (stock_id, published_at)
);


-- ============================================================
-- 11. MARKET INDICES
-- NIFTY, SENSEX, NASDAQ, S&P 500, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS market_indices (
    id INT AUTO_INCREMENT PRIMARY KEY,

    symbol VARCHAR(50) NOT NULL,
    index_name VARCHAR(200) NOT NULL,

    exchange VARCHAR(100),

    country VARCHAR(100),

    currency VARCHAR(10),

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_index_symbol (symbol)
);


-- ============================================================
-- 12. MARKET INDEX PRICES
-- Historical index data
-- ============================================================

CREATE TABLE IF NOT EXISTS market_index_prices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    index_id INT NOT NULL,

    trading_date DATE NOT NULL,

    open_price DECIMAL(15,4),
    high_price DECIMAL(15,4),
    low_price DECIMAL(15,4),
    close_price DECIMAL(15,4),

    volume BIGINT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (index_id)
        REFERENCES market_indices(id)
        ON DELETE CASCADE,

    UNIQUE KEY unique_index_date (index_id, trading_date),

    INDEX idx_index_date (index_id, trading_date)
);
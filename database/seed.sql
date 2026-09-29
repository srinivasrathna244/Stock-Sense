-- ============================================================
-- StockSense Database Seed Script
-- ============================================================

USE stocksense;

-- 1. SEED STOCKS
INSERT INTO stocks (symbol, company_name, exchange, country, sector, industry, currency, is_active)
VALUES
('RELIANCE.BSE', 'Reliance Industries Limited', 'BSE', 'India', 'Energy', 'Oil & Gas Refining', 'INR', TRUE),
('TCS.BSE', 'Tata Consultancy Services Limited', 'BSE', 'India', 'Technology', 'IT Services', 'INR', TRUE),
('INFY.BSE', 'Infosys Limited', 'BSE', 'India', 'Technology', 'IT Services', 'INR', TRUE),
('HDFCBANK.BSE', 'HDFC Bank Limited', 'BSE', 'India', 'Financial Services', 'Private Banking', 'INR', TRUE),
('ICICIBANK.BSE', 'ICICI Bank Limited', 'BSE', 'India', 'Financial Services', 'Private Banking', 'INR', TRUE),
('SBIN.BSE', 'State Bank of India', 'BSE', 'India', 'Financial Services', 'Public Sector Banking', 'INR', TRUE),
('ITC.BSE', 'ITC Limited', 'BSE', 'India', 'Consumer Goods', 'FMCG', 'INR', TRUE),
('BHARTIARTL.BSE', 'Bharti Airtel Limited', 'BSE', 'India', 'Telecommunication', 'Telecom Services', 'INR', TRUE)
ON DUPLICATE KEY UPDATE
    company_name = VALUES(company_name),
    sector = VALUES(sector),
    industry = VALUES(industry);

-- 2. SEED MARKET INDICES
INSERT INTO market_indices (symbol, index_name, exchange, country, currency, is_active)
VALUES
('SENSEX', 'BSE SENSEX', 'BSE', 'India', 'INR', TRUE),
('NIFTY50', 'NIFTY 50', 'NSE', 'India', 'INR', TRUE)
ON DUPLICATE KEY UPDATE
    index_name = VALUES(index_name);

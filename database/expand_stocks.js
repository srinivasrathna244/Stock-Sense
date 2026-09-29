const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });
const db = require("../backend/config/database");
const technicalAnalysisService = require("../backend/services/technicalAnalysisService");

// 52 Legitimate Indian Stocks across 15+ Sectors and Large/Mid/Small Market Caps
const EXPANDED_STOCKS = [
    // 1. IT & Technology
    { symbol: "RELIANCE.BSE", company_name: "Reliance Industries Limited", exchange: "BSE", sector: "Energy", industry: "Oil & Gas Refining", market_cap_category: "Large Cap", base_price: 1307.50 },
    { symbol: "TCS.BSE", company_name: "Tata Consultancy Services Limited", exchange: "BSE", sector: "Technology", industry: "IT Services", market_cap_category: "Large Cap", base_price: 2291.00 },
    { symbol: "INFY.BSE", company_name: "Infosys Limited", exchange: "BSE", sector: "Technology", industry: "IT Services", market_cap_category: "Large Cap", base_price: 1780.50 },
    { symbol: "WIPRO.BSE", company_name: "Wipro Limited", exchange: "BSE", sector: "Technology", industry: "IT Services", market_cap_category: "Large Cap", base_price: 540.20 },
    { symbol: "HCLTECH.BSE", company_name: "HCL Technologies Limited", exchange: "BSE", sector: "Technology", industry: "IT Services", market_cap_category: "Large Cap", base_price: 1680.00 },
    { symbol: "TECHM.BSE", company_name: "Tech Mahindra Limited", exchange: "BSE", sector: "Technology", industry: "IT Services", market_cap_category: "Large Cap", base_price: 1520.40 },
    { symbol: "LTIM.BSE", company_name: "LTIMindtree Limited", exchange: "BSE", sector: "Technology", industry: "IT Services", market_cap_category: "Large Cap", base_price: 5850.00 },
    { symbol: "PERSISTENT.BSE", company_name: "Persistent Systems Limited", exchange: "BSE", sector: "Technology", industry: "Software Products", market_cap_category: "Mid Cap", base_price: 4950.00 },
    { symbol: "COFORGE.BSE", company_name: "Coforge Limited", exchange: "BSE", sector: "Technology", industry: "IT Services", market_cap_category: "Mid Cap", base_price: 6800.00 },

    // 2. Banking & Financial Services
    { symbol: "HDFCBANK.BSE", company_name: "HDFC Bank Limited", exchange: "BSE", sector: "Financial Services", industry: "Private Banking", market_cap_category: "Large Cap", base_price: 1640.00 },
    { symbol: "ICICIBANK.BSE", company_name: "ICICI Bank Limited", exchange: "BSE", sector: "Financial Services", industry: "Private Banking", market_cap_category: "Large Cap", base_price: 1220.00 },
    { symbol: "SBIN.BSE", company_name: "State Bank of India", exchange: "BSE", sector: "Financial Services", industry: "Public Sector Banking", market_cap_category: "Large Cap", base_price: 810.50 },
    { symbol: "KOTAKBANK.BSE", company_name: "Kotak Mahindra Bank Limited", exchange: "BSE", sector: "Financial Services", industry: "Private Banking", market_cap_category: "Large Cap", base_price: 1780.00 },
    { symbol: "AXISBANK.BSE", company_name: "Axis Bank Limited", exchange: "BSE", sector: "Financial Services", industry: "Private Banking", market_cap_category: "Large Cap", base_price: 1180.00 },
    { symbol: "INDUSINDBK.BSE", company_name: "IndusInd Bank Limited", exchange: "BSE", sector: "Financial Services", industry: "Private Banking", market_cap_category: "Large Cap", base_price: 1420.00 },
    { symbol: "BANKBARODA.BSE", company_name: "Bank of Baroda", exchange: "BSE", sector: "Financial Services", industry: "Public Sector Banking", market_cap_category: "Mid Cap", base_price: 245.00 },
    { symbol: "FEDERALBNK.BSE", company_name: "The Federal Bank Limited", exchange: "BSE", sector: "Financial Services", industry: "Private Banking", market_cap_category: "Mid Cap", base_price: 195.00 },
    { symbol: "IDFCFIRSTB.BSE", company_name: "IDFC First Bank Limited", exchange: "BSE", sector: "Financial Services", industry: "Private Banking", market_cap_category: "Mid Cap", base_price: 72.50 },
    { symbol: "BAJFINANCE.BSE", company_name: "Bajaj Finance Limited", exchange: "BSE", sector: "Financial Services", industry: "Non-Banking Financial", market_cap_category: "Large Cap", base_price: 7150.00 },
    { symbol: "BAJAJFINSV.BSE", company_name: "Bajaj Finserv Limited", exchange: "BSE", sector: "Financial Services", industry: "Financial Holding", market_cap_category: "Large Cap", base_price: 1820.00 },
    { symbol: "CHOLAFIN.BSE", company_name: "Cholamandalam Investment and Finance", exchange: "BSE", sector: "Financial Services", industry: "Vehicle Finance", market_cap_category: "Mid Cap", base_price: 1480.00 },
    { symbol: "MUTHOOTFIN.BSE", company_name: "Muthoot Finance Limited", exchange: "BSE", sector: "Financial Services", industry: "Gold Loans", market_cap_category: "Mid Cap", base_price: 1920.00 },

    // 3. Automobiles & Auto Components
    { symbol: "TATAMOTORS.BSE", company_name: "Tata Motors Limited", exchange: "BSE", sector: "Automobile", industry: "Commercial & Passenger Vehicles", market_cap_category: "Large Cap", base_price: 1040.00 },
    { symbol: "MARUTI.BSE", company_name: "Maruti Suzuki India Limited", exchange: "BSE", sector: "Automobile", industry: "Passenger Cars", market_cap_category: "Large Cap", base_price: 12300.00 },
    { symbol: "M&M.BSE", company_name: "Mahindra & Mahindra Limited", exchange: "BSE", sector: "Automobile", industry: "SUVs & Farm Equipment", market_cap_category: "Large Cap", base_price: 2850.00 },
    { symbol: "BAJAJ-AUTO.BSE", company_name: "Bajaj Auto Limited", exchange: "BSE", sector: "Automobile", industry: "Two & Three Wheelers", market_cap_category: "Large Cap", base_price: 10800.00 },
    { symbol: "HEROMOTOCO.BSE", company_name: "Hero MotoCorp Limited", exchange: "BSE", sector: "Automobile", industry: "Motorcycles", market_cap_category: "Large Cap", base_price: 5450.00 },
    { symbol: "TVSMOTOR.BSE", company_name: "TVS Motor Company Limited", exchange: "BSE", sector: "Automobile", industry: "Two Wheelers", market_cap_category: "Large Cap", base_price: 2650.00 },

    // 4. Pharmaceuticals & Healthcare
    { symbol: "SUNPHARMA.BSE", company_name: "Sun Pharmaceutical Industries Limited", exchange: "BSE", sector: "Healthcare", industry: "Pharmaceuticals", market_cap_category: "Large Cap", base_price: 1820.00 },
    { symbol: "DRREDDY.BSE", company_name: "Dr. Reddy's Laboratories Limited", exchange: "BSE", sector: "Healthcare", industry: "Generics & APIs", market_cap_category: "Large Cap", base_price: 6750.00 },
    { symbol: "CIPLA.BSE", company_name: "Cipla Limited", exchange: "BSE", sector: "Healthcare", industry: "Respiratory & Formulations", market_cap_category: "Large Cap", base_price: 1590.00 },
    { symbol: "DIVISLAB.BSE", company_name: "Divi's Laboratories Limited", exchange: "BSE", sector: "Healthcare", industry: "Active Pharma Ingredients", market_cap_category: "Large Cap", base_price: 5200.00 },
    { symbol: "APOLLOHOSP.BSE", company_name: "Apollo Hospitals Enterprise Limited", exchange: "BSE", sector: "Healthcare", industry: "Hospital Chains", market_cap_category: "Large Cap", base_price: 6950.00 },
    { symbol: "LUPIN.BSE", company_name: "Lupin Limited", exchange: "BSE", sector: "Healthcare", industry: "Pharmaceuticals", market_cap_category: "Mid Cap", base_price: 2150.00 },
    { symbol: "BIOCON.BSE", company_name: "Biocon Limited", exchange: "BSE", sector: "Healthcare", industry: "Biotechnology & Biosimilars", market_cap_category: "Mid Cap", base_price: 345.00 },

    // 5. Energy, Oil & Gas
    { symbol: "ONGC.BSE", company_name: "Oil and Natural Gas Corporation", exchange: "BSE", sector: "Energy", industry: "Oil & Gas Exploration", market_cap_category: "Large Cap", base_price: 315.00 },
    { symbol: "BPCL.BSE", company_name: "Bharat Petroleum Corporation Limited", exchange: "BSE", sector: "Energy", industry: "Petroleum Refining", market_cap_category: "Large Cap", base_price: 345.00 },
    { symbol: "IOC.BSE", company_name: "Indian Oil Corporation Limited", exchange: "BSE", sector: "Energy", industry: "Refining & Marketing", market_cap_category: "Large Cap", base_price: 175.00 },
    { symbol: "GAIL.BSE", company_name: "GAIL (India) Limited", exchange: "BSE", sector: "Energy", industry: "Natural Gas Transmission", market_cap_category: "Large Cap", base_price: 225.00 },
    { symbol: "COALINDIA.BSE", company_name: "Coal India Limited", exchange: "BSE", sector: "Energy", industry: "Coal Mining", market_cap_category: "Large Cap", base_price: 510.00 },

    // 6. FMCG & Consumer Goods
    { symbol: "ITC.BSE", company_name: "ITC Limited", exchange: "BSE", sector: "Consumer Goods", industry: "FMCG & Diversified", market_cap_category: "Large Cap", base_price: 505.00 },
    { symbol: "HINDUNILVR.BSE", company_name: "Hindustan Unilever Limited", exchange: "BSE", sector: "Consumer Goods", industry: "Personal Care & Foods", market_cap_category: "Large Cap", base_price: 2780.00 },
    { symbol: "NESTLEIND.BSE", company_name: "Nestle India Limited", exchange: "BSE", sector: "Consumer Goods", industry: "Packaged Foods", market_cap_category: "Large Cap", base_price: 2480.00 },
    { symbol: "BRITANNIA.BSE", company_name: "Britannia Industries Limited", exchange: "BSE", sector: "Consumer Goods", industry: "Bakery & Dairy", market_cap_category: "Large Cap", base_price: 5850.00 },
    { symbol: "DABUR.BSE", company_name: "Dabur India Limited", exchange: "BSE", sector: "Consumer Goods", industry: "Ayurvedic & Healthcare", market_cap_category: "Large Cap", base_price: 630.00 },
    { symbol: "TATACONSUM.BSE", company_name: "Tata Consumer Products Limited", exchange: "BSE", sector: "Consumer Goods", industry: "Tea, Coffee & Foods", market_cap_category: "Large Cap", base_price: 1180.00 },

    // 7. Metals & Mining
    { symbol: "TATASTEEL.BSE", company_name: "Tata Steel Limited", exchange: "BSE", sector: "Metals & Mining", industry: "Steel Manufacturing", market_cap_category: "Large Cap", base_price: 155.00 },
    { symbol: "JSWSTEEL.BSE", company_name: "JSW Steel Limited", exchange: "BSE", sector: "Metals & Mining", industry: "Steel Production", market_cap_category: "Large Cap", base_price: 940.00 },
    { symbol: "HINDALCO.BSE", company_name: "Hindalco Industries Limited", exchange: "BSE", sector: "Metals & Mining", industry: "Aluminium & Copper", market_cap_category: "Large Cap", base_price: 680.00 },
    { symbol: "VEDL.BSE", company_name: "Vedanta Limited", exchange: "BSE", sector: "Metals & Mining", industry: "Diversified Natural Resources", market_cap_category: "Large Cap", base_price: 460.00 },
    { symbol: "JINDALSTEL.BSE", company_name: "Jindal Steel & Power Limited", exchange: "BSE", sector: "Metals & Mining", industry: "Steel & Power", market_cap_category: "Mid Cap", base_price: 980.00 },

    // 8. Infrastructure, Cement & Conglomerates
    { symbol: "LT.BSE", company_name: "Larsen & Toubro Limited", exchange: "BSE", sector: "Infrastructure", industry: "Engineering & Construction", market_cap_category: "Large Cap", base_price: 3650.00 },
    { symbol: "ULTRACEMCO.BSE", company_name: "UltraTech Cement Limited", exchange: "BSE", sector: "Infrastructure", industry: "Cement & Building Materials", market_cap_category: "Large Cap", base_price: 11400.00 },
    { symbol: "GRASIM.BSE", company_name: "Grasim Industries Limited", exchange: "BSE", sector: "Infrastructure", industry: "Viscose & Chemicals", market_cap_category: "Large Cap", base_price: 2680.00 },
    { symbol: "ADANIPORTS.BSE", company_name: "Adani Ports and Special Economic Zone", exchange: "BSE", sector: "Infrastructure", industry: "Ports & Logistics", market_cap_category: "Large Cap", base_price: 1480.00 },

    // 9. Power & Renewable Energy
    { symbol: "NTPC.BSE", company_name: "NTPC Limited", exchange: "BSE", sector: "Power", industry: "Thermal & Solar Power", market_cap_category: "Large Cap", base_price: 410.00 },
    { symbol: "POWERGRID.BSE", company_name: "Power Grid Corporation of India", exchange: "BSE", sector: "Power", industry: "Power Transmission", market_cap_category: "Large Cap", base_price: 335.00 },
    { symbol: "TATAPOWER.BSE", company_name: "Tata Power Company Limited", exchange: "BSE", sector: "Power", industry: "Integrated Utilities", market_cap_category: "Large Cap", base_price: 425.00 },
    { symbol: "ADANIGREEN.BSE", company_name: "Adani Green Energy Limited", exchange: "BSE", sector: "Renewable Energy", industry: "Solar & Wind Power", market_cap_category: "Large Cap", base_price: 1890.00 },
    { symbol: "SUZLON.BSE", company_name: "Suzlon Energy Limited", exchange: "BSE", sector: "Renewable Energy", industry: "Wind Turbines", market_cap_category: "Small Cap", base_price: 78.50 },

    // 10. Defence & Aerospace
    { symbol: "HAL.BSE", company_name: "Hindustan Aeronautics Limited", exchange: "BSE", sector: "Defence", industry: "Aerospace & Defence", market_cap_category: "Large Cap", base_price: 4750.00 },
    { symbol: "BEL.BSE", company_name: "Bharat Electronics Limited", exchange: "BSE", sector: "Defence", industry: "Defence Electronics", market_cap_category: "Large Cap", base_price: 295.00 },
    { symbol: "BDL.BSE", company_name: "Bharat Dynamics Limited", exchange: "BSE", sector: "Defence", industry: "Guided Missiles", market_cap_category: "Mid Cap", base_price: 1420.00 },
    { symbol: "MAZDOCK.BSE", company_name: "Mazagon Dock Shipbuilders Limited", exchange: "BSE", sector: "Defence", industry: "Shipbuilding & Submarines", market_cap_category: "Mid Cap", base_price: 4450.00 },

    // 11. Chemicals & Specialty Materials
    { symbol: "PIDILITIND.BSE", company_name: "Pidilite Industries Limited", exchange: "BSE", sector: "Chemicals", industry: "Adhesives & Sealants", market_cap_category: "Large Cap", base_price: 3180.00 },
    { symbol: "SRF.BSE", company_name: "SRF Limited", exchange: "BSE", sector: "Chemicals", industry: "Specialty Fluorochemicals", market_cap_category: "Large Cap", base_price: 2350.00 },
    { symbol: "AARTIIND.BSE", company_name: "Aarti Industries Limited", exchange: "BSE", sector: "Chemicals", industry: "Benzene Derivatives", market_cap_category: "Mid Cap", base_price: 580.00 },
    { symbol: "TATACHEM.BSE", company_name: "Tata Chemicals Limited", exchange: "BSE", sector: "Chemicals", industry: "Soda Ash & Basic Chem", market_cap_category: "Mid Cap", base_price: 1040.00 },

    // 12. Retail, Consumer Tech & New-Age
    { symbol: "DMART.BSE", company_name: "Avenue Supermarts Limited (DMart)", exchange: "BSE", sector: "Retail", industry: "Supermarket Chains", market_cap_category: "Large Cap", base_price: 4950.00 },
    { symbol: "TRENT.BSE", company_name: "Trent Limited", exchange: "BSE", sector: "Retail", industry: "Apparel & Lifestyle", market_cap_category: "Large Cap", base_price: 7200.00 },
    { symbol: "ZOMATO.BSE", company_name: "Zomato Limited", exchange: "BSE", sector: "Technology", industry: "Food Delivery & Quick Commerce", market_cap_category: "Large Cap", base_price: 260.00 },
    { symbol: "NYKAA.BSE", company_name: "FSN E-Commerce Ventures (Nykaa)", exchange: "BSE", sector: "Retail", industry: "Beauty & Personal Care", market_cap_category: "Mid Cap", base_price: 215.00 },

    // 13. Telecom
    { symbol: "BHARTIARTL.BSE", company_name: "Bharti Airtel Limited", exchange: "BSE", sector: "Telecommunication", industry: "Wireless & Broadband", market_cap_category: "Large Cap", base_price: 1540.00 },
    { symbol: "TATACOMM.BSE", company_name: "Tata Communications Limited", exchange: "BSE", sector: "Telecommunication", industry: "Enterprise Telecom", market_cap_category: "Mid Cap", base_price: 1980.00 }
];

async function runExpansion() {
    console.log("==================================================");
    console.log("  StockSense — Catalog Expansion & Seeding");
    console.log("==================================================");

    try {
        // 1. Schema migration: Add market_cap_category and sync_status table
        console.log("Applying schema migrations...");
        try {
            await db.query(`
                ALTER TABLE stocks
                ADD COLUMN market_cap_category VARCHAR(50) DEFAULT 'Large Cap' AFTER industry,
                ADD INDEX idx_stocks_sector (sector),
                ADD INDEX idx_stocks_category (market_cap_category),
                ADD INDEX idx_stocks_symbol (symbol);
            `);
            console.log("Added market_cap_category and indexes to stocks table.");
        } catch (alterErr) {
            if (!alterErr.message.includes("Duplicate column") && !alterErr.message.includes("Duplicate key")) {
                console.warn("Stocks schema alter note:", alterErr.message);
            }
        }

        // Create stock_data_sync_status table
        await db.query(`
            CREATE TABLE IF NOT EXISTS stock_data_sync_status (
                id INT AUTO_INCREMENT PRIMARY KEY,
                stock_id INT NOT NULL UNIQUE,
                last_sync_date DATE NULL,
                last_success_at TIMESTAMP NULL,
                last_attempt_at TIMESTAMP NULL,
                status ENUM('SUCCESS', 'FAILED', 'PENDING', 'IN_PROGRESS') DEFAULT 'PENDING',
                error_message TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("Created/verified stock_data_sync_status table.");

        // 2. Insert or update stocks
        console.log(`\nUpserting ${EXPANDED_STOCKS.length} Indian stocks across sectors...`);
        let insertedStocks = 0;

        for (const item of EXPANDED_STOCKS) {
            const [res] = await db.query(`
                INSERT INTO stocks (symbol, company_name, exchange, country, sector, industry, market_cap_category, currency, is_active)
                VALUES (?, ?, ?, 'India', ?, ?, ?, 'INR', TRUE)
                ON DUPLICATE KEY UPDATE
                    company_name = VALUES(company_name),
                    sector = VALUES(sector),
                    industry = VALUES(industry),
                    market_cap_category = VALUES(market_cap_category);
            `, [item.symbol, item.company_name, item.exchange, item.sector, item.industry, item.market_cap_category]);

            const [stockRow] = await db.query("SELECT id FROM stocks WHERE symbol = ?", [item.symbol]);
            const stockId = stockRow[0].id;

            // Initialize sync status
            await db.query(`
                INSERT INTO stock_data_sync_status (stock_id, last_sync_date, last_success_at, status)
                VALUES (?, CURDATE(), NOW(), 'SUCCESS')
                ON DUPLICATE KEY UPDATE
                    last_attempt_at = NOW();
            `, [stockId]);

            // Check if stock has historical price records
            const [existingPrices] = await db.query("SELECT count(*) as c FROM stock_prices WHERE stock_id = ?", [stockId]);

            if (existingPrices[0].c < 20) {
                // Seed 100 historical sessions based on base_price with natural daily volatility
                console.log(`  Generating baseline historical prices for ${item.symbol}...`);
                const today = new Date();
                let cur = item.base_price;

                // Dates array backwards (120 calendar days ~ 80 trading sessions)
                const priceRecords = [];
                for (let d = 110; d >= 0; d--) {
                    const date = new Date(today.getTime() - d * 24 * 60 * 60 * 1000);
                    const dayOfWeek = date.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

                    // Deterministic pseudorandom daily walk
                    const seed = (stockId * 37 + d * 13) % 1000;
                    const dailyPct = ((seed / 500) - 1) * 0.018; // -1.8% to +1.8%
                    const open = Number((cur * (1 + (dailyPct * 0.4))).toFixed(2));
                    const high = Number((Math.max(open, cur) * (1 + Math.abs(dailyPct) * 0.6)).toFixed(2));
                    const low = Number((Math.min(open, cur) * (1 - Math.abs(dailyPct) * 0.6)).toFixed(2));
                    const close = Number((cur * (1 + dailyPct)).toFixed(2));
                    const volume = Math.floor(100000 + (seed * 1500));
                    cur = close;

                    priceRecords.push([
                        stockId,
                        date.toISOString().split("T")[0],
                        open,
                        high,
                        low,
                        close,
                        close,
                        volume
                    ]);
                }

                for (const rec of priceRecords) {
                    await db.query(`
                        INSERT INTO stock_prices (stock_id, trading_date, open_price, high_price, low_price, close_price, adjusted_close, volume)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            close_price = VALUES(close_price);
                    `, rec);
                }

                // Compute technical indicators for newly inserted stock
                await technicalAnalysisService.calculateAllIndicators(stockId);
                insertedStocks++;
            }
        }

        const [finalCount] = await db.query("SELECT count(*) as count FROM stocks WHERE is_active = TRUE");
        const [finalPrices] = await db.query("SELECT count(*) as count FROM stock_prices");
        const [finalInds] = await db.query("SELECT count(*) as count FROM technical_indicators");

        console.log("\n==================================================");
        console.log(`Catalog expansion completed!`);
        console.log(`Total Active Stocks:       ${finalCount[0].count}`);
        console.log(`Total Historical Prices:   ${finalPrices[0].count}`);
        console.log(`Total Technical Indicators:${finalInds[0].count}`);
        console.log("==================================================");

        process.exit(0);

    } catch (err) {
        console.error("Expansion Error:", err);
        process.exit(1);
    }
}

runExpansion();

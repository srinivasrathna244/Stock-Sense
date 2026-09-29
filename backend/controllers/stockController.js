const db = require("../config/database");
const axios = require("axios");
const marketDataService = require("../services/marketDataService");
const technicalAnalysisService = require("../services/technicalAnalysisService");

/**
 * Get all stocks with search, filter, sorting, and pagination
 */
const getAllStocks = async (req, res) => {
    try {
        const {
            q,
            sector,
            category,
            exchange,
            page = 1,
            limit = 50,
            sort_by = "name_asc"
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const offset = (pageNum - 1) * limitNum;

        const conditions = ["is_active = TRUE"];
        const params = [];

        if (q && q.trim() !== "") {
            const term = `%${q.trim()}%`;
            conditions.push("(symbol LIKE ? OR company_name LIKE ? OR sector LIKE ? OR industry LIKE ?)");
            params.push(term, term, term, term);
        }

        if (sector && sector.trim() !== "" && sector.toLowerCase() !== "all") {
            conditions.push("sector = ?");
            params.push(sector.trim());
        }

        if (category && category.trim() !== "" && category.toLowerCase() !== "all") {
            conditions.push("market_cap_category = ?");
            params.push(category.trim());
        }

        if (exchange && exchange.trim() !== "") {
            conditions.push("exchange = ?");
            params.push(exchange.trim());
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        let orderBy = "company_name ASC";
        if (sort_by === "name_desc") orderBy = "company_name DESC";
        else if (sort_by === "symbol_asc") orderBy = "symbol ASC";
        else if (sort_by === "sector_asc") orderBy = "sector ASC, company_name ASC";

        // Get total count for pagination
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM stocks ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Fetch paginated stocks
        const [stocks] = await db.query(
            `SELECT
                id,
                symbol,
                company_name,
                exchange,
                country,
                sector,
                industry,
                market_cap_category,
                currency
             FROM stocks
             ${whereClause}
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`,
            [...params, limitNum, offset]
        );

        res.status(200).json({
            success: true,
            count: stocks.length,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            stocks
        });

    } catch (error) {
        console.error("Get stocks error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch stocks"
        });
    }
};

/**
 * Search stocks by query keyword
 */
const searchStocks = async (req, res) => {
    try {
        const searchTerm = req.query.q;

        if (!searchTerm || searchTerm.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search term is required"
            });
        }

        const term = `%${searchTerm.trim()}%`;

        const [stocks] = await db.query(
            `SELECT
                id,
                symbol,
                company_name,
                exchange,
                country,
                sector,
                industry,
                market_cap_category,
                currency
             FROM stocks
             WHERE is_active = TRUE
             AND (
                 symbol LIKE ?
                 OR company_name LIKE ?
                 OR sector LIKE ?
                 OR industry LIKE ?
             )
             ORDER BY
                CASE
                    WHEN symbol LIKE ? THEN 1
                    WHEN company_name LIKE ? THEN 2
                    ELSE 3
                END,
                company_name ASC
             LIMIT 30`,
            [term, term, term, term, term, term]
        );

        res.status(200).json({
            success: true,
            count: stocks.length,
            stocks
        });

    } catch (error) {
        console.error("Search stocks error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to search stocks"
        });
    }
};

/**
 * Get distinct sectors with stock count
 */
const getSectors = async (req, res) => {
    try {
        const [sectors] = await db.query(`
            SELECT
                COALESCE(sector, 'General') as sector,
                COUNT(*) as count
            FROM stocks
            WHERE is_active = TRUE
            GROUP BY sector
            ORDER BY count DESC, sector ASC
        `);

        res.status(200).json({
            success: true,
            count: sectors.length,
            sectors
        });
    } catch (error) {
        console.error("Get sectors error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch sectors"
        });
    }
};

/**
 * Stock Discovery (Gainers, Losers, Popular, Active)
 */
const getStockDiscovery = async (req, res) => {
    try {
        const [stocks] = await db.query(`
            SELECT id, symbol, company_name, exchange, sector, industry, market_cap_category
            FROM stocks
            WHERE is_active = TRUE
        `);

        // Fetch latest price record for each stock
        const [latestPrices] = await db.query(`
            SELECT sp.stock_id, sp.close_price, sp.volume, sp.trading_date
            FROM stock_prices sp
            INNER JOIN (
                SELECT stock_id, MAX(trading_date) as max_date
                FROM stock_prices
                GROUP BY stock_id
            ) m ON sp.stock_id = m.stock_id AND sp.trading_date = m.max_date
        `);

        // Fetch previous price record for each stock
        const [prevPrices] = await db.query(`
            SELECT sp.stock_id, sp.close_price
            FROM stock_prices sp
            INNER JOIN (
                SELECT sp1.stock_id, MAX(sp1.trading_date) as prev_date
                FROM stock_prices sp1
                INNER JOIN (
                    SELECT stock_id, MAX(trading_date) as max_date
                    FROM stock_prices
                    GROUP BY stock_id
                ) m ON sp1.stock_id = m.stock_id AND sp1.trading_date < m.max_date
                GROUP BY sp1.stock_id
            ) m2 ON sp.stock_id = m2.stock_id AND sp.trading_date = m2.prev_date
        `);

        const latestMap = {};
        latestPrices.forEach(p => { latestMap[p.stock_id] = p; });

        const prevMap = {};
        prevPrices.forEach(p => { prevMap[p.stock_id] = p; });

        const stockSummaries = [];

        stocks.forEach(s => {
            const latest = latestMap[s.id];
            if (latest) {
                const price = Number(latest.close_price);
                const prev = prevMap[s.id];
                const prevClose = prev ? Number(prev.close_price) : price;
                const change = Number((price - prevClose).toFixed(2));
                const changePercentNum = prevClose > 0 ? ((change / prevClose) * 100) : 0;
                const changePercent = `${changePercentNum >= 0 ? "+" : ""}${changePercentNum.toFixed(2)}%`;

                stockSummaries.push({
                    id: s.id,
                    symbol: s.symbol,
                    company_name: s.company_name,
                    exchange: s.exchange,
                    sector: s.sector,
                    industry: s.industry,
                    market_cap_category: s.market_cap_category,
                    price,
                    change,
                    changePercent,
                    changeNum: changePercentNum,
                    volume: Number(latest.volume || 0),
                    latestTradingDay: latest.trading_date instanceof Date ? latest.trading_date.toISOString().split("T")[0] : String(latest.trading_date).split("T")[0]
                });
            }
        });

        // Sort gainers & losers
        const sortedByGain = [...stockSummaries].sort((a, b) => b.changeNum - a.changeNum);
        const topGainers = sortedByGain.filter(s => s.changeNum > 0).slice(0, 6);
        const topLosers = [...sortedByGain].reverse().filter(s => s.changeNum < 0).slice(0, 6);
        const mostActive = [...stockSummaries].sort((a, b) => b.volume - a.volume).slice(0, 6);

        // Curated popular stocks
        const popularSymbols = ["RELIANCE.BSE", "TCS.BSE", "INFY.BSE", "HDFCBANK.BSE", "ICICIBANK.BSE", "SBIN.BSE", "TATAMOTORS.BSE", "ITC.BSE"];
        const popular = stockSummaries.filter(s => popularSymbols.includes(s.symbol));

        // Group counts by sector
        const sectorCounts = {};
        stockSummaries.forEach(s => {
            const sec = s.sector || "Other";
            sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
        });

        res.status(200).json({
            success: true,
            totalActive: stocks.length,
            popular,
            topGainers,
            topLosers,
            mostActive,
            sectorCounts
        });

    } catch (error) {
        console.error("Discovery error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to load stock discovery data"
        });
    }
};

/**
 * Compare 2 or more stocks side-by-side
 */
const compareStocks = async (req, res) => {
    try {
        const { symbols } = req.query;

        if (!symbols || symbols.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Comma-separated symbols parameter is required (e.g., ?symbols=TCS.BSE,INFY.BSE)"
            });
        }

        const symbolList = symbols.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

        if (symbolList.length < 2) {
            return res.status(400).json({
                success: false,
                message: "At least 2 stock symbols are required for comparison"
            });
        }

        const comparisonData = [];

        for (const sym of symbolList) {
            const [stocks] = await db.query(
                "SELECT id, symbol, company_name, exchange, sector, industry, market_cap_category, currency FROM stocks WHERE symbol = ? AND is_active = TRUE LIMIT 1",
                [sym]
            );

            if (stocks.length === 0) continue;
            const stock = stocks[0];

            let quote = null;
            try {
                quote = await marketDataService.getQuote(stock.symbol);
            } catch (e) {
                console.warn(`Quote failed for ${stock.symbol}:`, e.message);
            }

            // Latest indicator
            const [inds] = await db.query(
                `SELECT sma_20, sma_50, sma_200, ema_20, ema_50, rsi, macd, macd_signal, macd_histogram, bollinger_upper, bollinger_middle, bollinger_lower, volatility, trading_date
                 FROM technical_indicators
                 WHERE stock_id = ?
                 ORDER BY trading_date DESC LIMIT 1`,
                [stock.id]
            );

            // Latest AI prediction
            let aiPrediction = null;
            try {
                const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
                const aiRes = await axios.post(`${aiServiceUrl}/predict`, { stock_id: stock.id }, { timeout: 8000 });
                if (aiRes.data && aiRes.data.success) {
                    aiPrediction = aiRes.data.prediction;
                }
            } catch (aiErr) {
                // Fallback to database predictions table
                const [dbPreds] = await db.query(
                    `SELECT direction as prediction, confidence_score as confidence, predicted_price as predictedPrice, expected_change_percent as expectedChangePercent
                     FROM predictions WHERE stock_id = ? ORDER BY prediction_date DESC, id DESC LIMIT 1`,
                    [stock.id]
                );
                if (dbPreds.length > 0) {
                    aiPrediction = dbPreds[0];
                }
            }

            // Calculate 1W and 1M performance from stock_prices
            const [prices] = await db.query(
                "SELECT trading_date, close_price FROM stock_prices WHERE stock_id = ? ORDER BY trading_date DESC LIMIT 30",
                [stock.id]
            );

            let oneWeekPerf = null;
            let oneMonthPerf = null;

            if (prices.length > 5) {
                const cur = Number(prices[0].close_price);
                const w1 = Number(prices[Math.min(5, prices.length - 1)].close_price);
                oneWeekPerf = Number((((cur - w1) / w1) * 100).toFixed(2));
            }
            if (prices.length > 20) {
                const cur = Number(prices[0].close_price);
                const m1 = Number(prices[Math.min(21, prices.length - 1)].close_price);
                oneMonthPerf = Number((((cur - m1) / m1) * 100).toFixed(2));
            }

            comparisonData.push({
                stock,
                market: quote,
                performance: {
                    oneWeek: oneWeekPerf,
                    oneMonth: oneMonthPerf
                },
                technicalIndicators: inds.length > 0 ? inds[0] : null,
                aiAnalysis: aiPrediction
            });
        }

        res.status(200).json({
            success: true,
            count: comparisonData.length,
            comparison: comparisonData
        });

    } catch (error) {
        console.error("Comparison error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to generate stock comparison"
        });
    }
};

/**
 * Get individual stock details & quote
 */
const getStockDetails = async (req, res) => {
    try {
        const { symbol } = req.params;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: "Stock symbol is required"
            });
        }

        const [stocks] = await db.query(
            `SELECT
                id,
                symbol,
                company_name,
                exchange,
                country,
                sector,
                industry,
                market_cap_category,
                currency
             FROM stocks
             WHERE symbol = ?
             AND is_active = TRUE
             LIMIT 1`,
            [symbol]
        );

        if (stocks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
        }

        const stock = stocks[0];
        let marketData = null;

        try {
            marketData = await marketDataService.getQuote(symbol);
        } catch (quoteError) {
            console.warn("Quote fetch failed:", quoteError.message);
        }

        res.status(200).json({
            success: true,
            stock: {
                id: stock.id,
                symbol: stock.symbol,
                companyName: stock.company_name,
                exchange: stock.exchange,
                country: stock.country,
                sector: stock.sector,
                industry: stock.industry,
                marketCapCategory: stock.market_cap_category,
                currency: stock.currency
            },
            market: marketData
        });

    } catch (error) {
        console.error("Get stock details error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch stock details"
        });
    }
};

/**
 * Historical prices for interactive charts
 */
const getStockHistory = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { period = "1M" } = req.query;

        const [stocks] = await db.query(
            "SELECT id FROM stocks WHERE symbol = ? AND is_active = TRUE LIMIT 1",
            [symbol]
        );

        if (stocks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
        }

        const stockId = stocks[0].id;

        let limit = 22; // ~1 month
        if (period === "1W") limit = 5;
        else if (period === "1M") limit = 22;
        else if (period === "3M") limit = 66;
        else if (period === "6M") limit = 132;
        else if (period === "1Y") limit = 260;

        const [prices] = await db.query(
            `SELECT
                trading_date as date,
                open_price as open,
                high_price as high,
                low_price as low,
                close_price as close,
                adjusted_close as adjustedClose,
                volume
             FROM stock_prices
             WHERE stock_id = ?
             ORDER BY trading_date DESC
             LIMIT ?`,
            [stockId, limit]
        );

        const sortedPrices = prices.reverse();

        res.status(200).json({
            success: true,
            symbol,
            period,
            count: sortedPrices.length,
            prices: sortedPrices
        });

    } catch (error) {
        console.error("Get stock history error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch historical price data"
        });
    }
};

/**
 * Get computed technical indicators
 */
const getTechnicalIndicators = async (req, res) => {
    try {
        const { symbol } = req.params;

        const [stocks] = await db.query(
            "SELECT id FROM stocks WHERE symbol = ? AND is_active = TRUE LIMIT 1",
            [symbol]
        );

        if (stocks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
        }

        const stockId = stocks[0].id;

        const [indicators] = await db.query(
            `SELECT
                trading_date as tradingDate,
                sma_20 as sma20,
                sma_50 as sma50,
                sma_200 as sma200,
                ema_20 as ema20,
                ema_50 as ema50,
                rsi,
                macd,
                macd_signal as macdSignal,
                macd_histogram as macdHistogram,
                bollinger_upper as bollingerUpper,
                bollinger_middle as bollingerMiddle,
                bollinger_lower as bollingerLower,
                volatility
             FROM technical_indicators
             WHERE stock_id = ?
             ORDER BY trading_date DESC
             LIMIT 1`,
            [stockId]
        );

        if (indicators.length === 0) {
            // Calculate on the fly if not in DB yet
            const computed = await technicalAnalysisService.calculateAllIndicators(stockId);
            if (computed.length > 0) {
                return res.status(200).json({
                    success: true,
                    symbol,
                    indicators: computed[computed.length - 1]
                });
            }
            return res.status(404).json({
                success: false,
                message: "Technical indicators not available for this stock"
            });
        }

        res.status(200).json({
            success: true,
            symbol,
            indicators: indicators[0]
        });

    } catch (error) {
        console.error("Get technical indicators error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch technical indicators"
        });
    }
};

/**
 * Complete Stock Analysis (Quotes, Performance, Indicators, AI Prediction)
 */
const getStockAnalysis = async (req, res) => {
    try {
        const { symbol } = req.params;

        const [stocks] = await db.query(
            "SELECT id, symbol, company_name, exchange, country, sector, industry, market_cap_category, currency FROM stocks WHERE symbol = ? AND is_active = TRUE LIMIT 1",
            [symbol]
        );

        if (stocks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
        }

        const stock = stocks[0];

        // 1. Market Quote
        let market = null;
        try {
            market = await marketDataService.getQuote(stock.symbol);
        } catch (e) {
            console.warn("Market quote warning:", e.message);
        }

        // 2. Technical Indicators
        const [indRows] = await db.query(
            `SELECT
                trading_date as tradingDate,
                sma_20 as sma20,
                sma_50 as sma50,
                sma_200 as sma200,
                ema_20 as ema20,
                ema_50 as ema50,
                rsi,
                macd,
                macd_signal as macdSignal,
                macd_histogram as macdHistogram,
                bollinger_upper as bollingerUpper,
                bollinger_middle as bollingerMiddle,
                bollinger_lower as bollingerLower,
                volatility
             FROM technical_indicators
             WHERE stock_id = ?
             ORDER BY trading_date DESC LIMIT 1`,
            [stock.id]
        );

        let technicalIndicators = indRows.length > 0 ? indRows[0] : null;

        if (!technicalIndicators) {
            const computed = await technicalAnalysisService.calculateAllIndicators(stock.id);
            if (computed.length > 0) {
                technicalIndicators = computed[computed.length - 1];
            }
        }

        // 3. Performance Periods
        const [prices] = await db.query(
            "SELECT trading_date, close_price FROM stock_prices WHERE stock_id = ? ORDER BY trading_date DESC LIMIT 120",
            [stock.id]
        );

        const performance = {
            oneWeek: null,
            oneMonth: null,
            threeMonths: null,
            sixMonths: null,
            oneYear: null
        };

        if (prices.length > 0) {
            const currentClose = Number(prices[0].close_price);

            const calcPerf = (offsetIndex) => {
                if (prices.length > offsetIndex) {
                    const pastPrice = Number(prices[offsetIndex].close_price);
                    const change = Number((currentClose - pastPrice).toFixed(2));
                    const changePercent = Number(((change / pastPrice) * 100).toFixed(2));
                    return {
                        startDate: prices[offsetIndex].trading_date,
                        endDate: prices[0].trading_date,
                        startPrice: pastPrice,
                        endPrice: currentClose,
                        change,
                        changePercent
                    };
                }
                return null;
            };

            performance.oneWeek = calcPerf(5);
            performance.oneMonth = calcPerf(21);
            performance.threeMonths = calcPerf(65);
            performance.sixMonths = calcPerf(125);
        }

        // 4. AI Prediction
        let aiPrediction = null;
        try {
            const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
            const aiResponse = await axios.post(
                `${aiServiceUrl}/predict`,
                { stock_id: stock.id },
                { timeout: 8000 }
            );
            aiPrediction = aiResponse.data.prediction;
        } catch (aiErr) {
            // DB fallback
            const [dbPreds] = await db.query(
                `SELECT direction as prediction, confidence_score as confidence, probability, predicted_price as predictedPrice, expected_change_percent as expectedChangePercent, model_name as model
                 FROM predictions WHERE stock_id = ? ORDER BY prediction_date DESC, id DESC LIMIT 1`,
                [stock.id]
            );

            if (dbPreds.length > 0) {
                aiPrediction = {
                    ...dbPreds[0],
                    confidence: `${dbPreds[0].confidence}%`,
                    currentPrice: market ? market.price : null,
                    disclaimer: "AI prediction is a probabilistic estimate and not financial advice."
                };
            } else {
                aiPrediction = {
                    prediction: "UNAVAILABLE",
                    probability: null,
                    confidence: null,
                    message: "AI prediction service is temporarily unavailable"
                };
            }
        }

        res.status(200).json({
            success: true,
            stock: {
                id: stock.id,
                symbol: stock.symbol,
                companyName: stock.company_name,
                exchange: stock.exchange,
                country: stock.country,
                sector: stock.sector,
                industry: stock.industry,
                marketCapCategory: stock.market_cap_category,
                currency: stock.currency
            },
            market,
            performance,
            technicalIndicators,
            aiAnalysis: aiPrediction,
            historicalRecords: prices.length
        });

    } catch (error) {
        console.error("Stock analysis error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to generate stock analysis"
        });
    }
};

/**
 * Get AI prediction for a stock
 */
const getStockPrediction = async (req, res) => {
    try {
        const { symbol } = req.params;
        const [stocks] = await db.query(
            "SELECT id, symbol, company_name FROM stocks WHERE symbol = ? AND is_active = TRUE LIMIT 1",
            [symbol]
        );

        if (stocks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
        }

        const stock = stocks[0];
        const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";

        const aiResponse = await axios.post(
            `${aiServiceUrl}/predict`,
            { stock_id: stock.id },
            { timeout: 8000 }
        );

        const prediction = aiResponse.data.prediction;

        return res.status(200).json({
            success: true,
            symbol: stock.symbol,
            companyName: stock.company_name,
            prediction: prediction.prediction,
            confidence: prediction.confidence,
            probability: prediction.probability,
            currentPrice: prediction.currentPrice,
            predictedPrice: prediction.predictedPrice,
            expectedChangePercent: prediction.expectedChangePercent,
            model: "Random Forest Classifier",
            generatedAt: new Date()
        });

    } catch (error) {
        console.error("Stock prediction error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to generate prediction"
        });
    }
};

/**
 * Synchronize stock data
 */
const syncStockHistory = async (req, res) => {
    try {
        const { symbol } = req.params;
        const [stocks] = await db.query("SELECT id, symbol FROM stocks WHERE symbol = ? LIMIT 1", [symbol]);

        if (stocks.length === 0) {
            return res.status(404).json({ success: false, message: "Stock not found" });
        }

        const stock = stocks[0];

        // Fetch fresh daily history and recalculate indicators
        const timeSeries = await marketDataService.getDailyHistory(stock.symbol);
        await technicalAnalysisService.syncAndSaveIndicators(stock.id);

        await db.query(`
            INSERT INTO stock_data_sync_status (stock_id, last_sync_date, last_success_at, status)
            VALUES (?, CURDATE(), NOW(), 'SUCCESS')
            ON DUPLICATE KEY UPDATE last_sync_date = CURDATE(), last_success_at = NOW(), status = 'SUCCESS'
        `, [stock.id]);

        res.status(200).json({
            success: true,
            message: `Data synchronized successfully for ${stock.symbol}`
        });
    } catch (error) {
        console.error("Sync error:", error.message);
        res.status(500).json({
            success: false,
            message: `Data synchronization failed: ${error.message}`
        });
    }
};

module.exports = {
    getAllStocks,
    searchStocks,
    getSectors,
    getStockDiscovery,
    compareStocks,
    getStockDetails,
    syncStockHistory,
    getStockHistory,
    getTechnicalIndicators,
    getStockAnalysis,
    getStockPrediction
};
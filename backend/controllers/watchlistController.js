const db = require("../config/database");
const marketDataService = require("../services/marketDataService");

/**
 * Get all stocks in user's watchlist with live market data & AI predictions
 */
const getWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;

        const [items] = await db.query(
            `SELECT
                w.id as watchlist_id,
                w.created_at as added_at,
                s.id as stock_id,
                s.symbol,
                s.company_name,
                s.exchange,
                s.country,
                s.sector,
                s.industry,
                s.currency
             FROM watchlists w
             INNER JOIN stocks s ON w.stock_id = s.id
             WHERE w.user_id = ?
             ORDER BY w.created_at DESC`,
            [userId]
        );

        // Fetch quote for each stock
        const watchlistWithQuotes = await Promise.all(
            items.map(async (item) => {
                let quote = null;
                try {
                    quote = await marketDataService.getQuote(item.symbol);
                } catch (qErr) {
                    console.warn(`Watchlist quote failed for ${item.symbol}:`, qErr.message);
                }

                // Check latest prediction if available
                let prediction = null;
                try {
                    const [preds] = await db.query(
                        `SELECT direction, confidence_score, predicted_price, expected_change_percent, prediction_date
                         FROM predictions
                         WHERE stock_id = ?
                         ORDER BY prediction_date DESC, id DESC
                         LIMIT 1`,
                        [item.stock_id]
                    );
                    if (preds.length > 0) {
                        prediction = preds[0];
                    }
                } catch (pErr) {
                    // Ignore optional prediction fetch error
                }

                return {
                    watchlistId: item.watchlist_id,
                    stockId: item.stock_id,
                    symbol: item.symbol,
                    companyName: item.company_name,
                    exchange: item.exchange,
                    sector: item.sector,
                    currency: item.currency,
                    addedAt: item.added_at,
                    market: quote || {
                        price: null,
                        change: 0,
                        changePercent: "0.00%"
                    },
                    prediction
                };
            })
        );

        res.status(200).json({
            success: true,
            count: watchlistWithQuotes.length,
            watchlist: watchlistWithQuotes
        });

    } catch (error) {
        console.error("Get watchlist error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch watchlist"
        });
    }
};

/**
 * Add stock to watchlist
 */
const addToWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.body;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: "Stock symbol is required"
            });
        }

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

        await db.query(
            "INSERT INTO watchlists (user_id, stock_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP",
            [userId, stock.id]
        );

        res.status(201).json({
            success: true,
            message: `${stock.symbol} added to watchlist`,
            stock: {
                id: stock.id,
                symbol: stock.symbol,
                companyName: stock.company_name
            }
        });

    } catch (error) {
        console.error("Add to watchlist error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to add stock to watchlist"
        });
    }
};

/**
 * Remove stock from watchlist
 */
const removeFromWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.params;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: "Stock symbol is required"
            });
        }

        const [stocks] = await db.query(
            "SELECT id FROM stocks WHERE symbol = ? LIMIT 1",
            [symbol]
        );

        if (stocks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Stock not found"
            });
        }

        const stockId = stocks[0].id;

        const [result] = await db.query(
            "DELETE FROM watchlists WHERE user_id = ? AND stock_id = ?",
            [userId, stockId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Stock is not in your watchlist"
            });
        }

        res.status(200).json({
            success: true,
            message: `${symbol} removed from watchlist`
        });

    } catch (error) {
        console.error("Remove from watchlist error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to remove stock from watchlist"
        });
    }
};

/**
 * Check if a stock is in user's watchlist
 */
const checkWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.params;

        const [rows] = await db.query(
            `SELECT w.id
             FROM watchlists w
             INNER JOIN stocks s ON w.stock_id = s.id
             WHERE w.user_id = ? AND s.symbol = ?
             LIMIT 1`,
            [userId, symbol]
        );

        res.status(200).json({
            success: true,
            inWatchlist: rows.length > 0
        });

    } catch (error) {
        console.error("Check watchlist error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to check watchlist status"
        });
    }
};

module.exports = {
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    checkWatchlist
};

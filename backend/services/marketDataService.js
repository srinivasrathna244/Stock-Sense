require("dotenv").config();

const axios = require("axios");
const db = require("../config/database");

const API_KEY = process.env.MARKET_DATA_API_KEY;
const BASE_URL = "https://www.alphavantage.co/query";

/**
 * Fetch latest quote from external API or fallback to latest DB price
 */
const getQuote = async (symbol) => {
    // 1. Try Alpha Vantage if valid API key is configured
    if (API_KEY && API_KEY.trim() !== "" && API_KEY !== "demo") {
        try {
            const response = await axios.get(BASE_URL, {
                params: {
                    function: "GLOBAL_QUOTE",
                    symbol,
                    apikey: API_KEY
                },
                timeout: 5000
            });

            const data = response.data;

            if (data && !data.Note && !data["Error Message"] && data["Global Quote"] && Object.keys(data["Global Quote"]).length > 0) {
                const quote = data["Global Quote"];
                return {
                    symbol: quote["01. symbol"] || symbol,
                    open: Number(quote["02. open"]),
                    high: Number(quote["03. high"]),
                    low: Number(quote["04. low"]),
                    price: Number(quote["05. price"]),
                    volume: Number(quote["06. volume"]),
                    latestTradingDay: quote["07. latest trading day"],
                    previousClose: Number(quote["08. previous close"]),
                    change: Number(quote["09. change"]),
                    changePercent: quote["10. change percent"]
                };
            }
        } catch (apiErr) {
            console.warn(`External quote API failed for ${symbol}, falling back to database:`, apiErr.message);
        }
    }

    // 2. Database Fallback
    try {
        const [rows] = await db.query(
            `SELECT sp.trading_date, sp.open_price, sp.high_price, sp.low_price, sp.close_price, sp.volume
             FROM stock_prices sp
             INNER JOIN stocks s ON sp.stock_id = s.id
             WHERE s.symbol = ?
             ORDER BY sp.trading_date DESC
             LIMIT 2`,
            [symbol]
        );

        if (rows.length === 0) {
            throw new Error(`No market data available for ${symbol}`);
        }

        const latest = rows[0];
        const previous = rows.length > 1 ? rows[1] : rows[0];

        const price = Number(latest.close_price);
        const prevClose = Number(previous.close_price);
        const change = Number((price - prevClose).toFixed(2));
        const changePercentNum = prevClose > 0 ? ((change / prevClose) * 100) : 0;
        const changePercent = `${changePercentNum >= 0 ? "+" : ""}${changePercentNum.toFixed(2)}%`;

        return {
            symbol,
            open: Number(latest.open_price),
            high: Number(latest.high_price),
            low: Number(latest.low_price),
            price,
            volume: Number(latest.volume),
            latestTradingDay: latest.trading_date instanceof Date
                ? latest.trading_date.toISOString().split("T")[0]
                : String(latest.trading_date).split("T")[0],
            previousClose: prevClose,
            change,
            changePercent
        };
    } catch (dbErr) {
        console.error("Database quote fallback error:", dbErr.message);
        throw dbErr;
    }
};

/**
 * Fetch daily historical data from external API or fallback to DB
 */
const getDailyHistory = async (symbol) => {
    if (API_KEY && API_KEY.trim() !== "" && API_KEY !== "demo") {
        try {
            const response = await axios.get(BASE_URL, {
                params: {
                    function: "TIME_SERIES_DAILY",
                    symbol,
                    outputsize: "compact",
                    apikey: API_KEY
                },
                timeout: 8000
            });

            const data = response.data;
            if (data && !data.Note && !data["Error Message"] && data["Time Series (Daily)"]) {
                return data["Time Series (Daily)"];
            }
        } catch (apiErr) {
            console.warn(`External history API failed for ${symbol}, falling back to database:`, apiErr.message);
        }
    }

    // Database Fallback
    const [rows] = await db.query(
        `SELECT sp.trading_date, sp.open_price, sp.high_price, sp.low_price, sp.close_price, sp.volume
         FROM stock_prices sp
         INNER JOIN stocks s ON sp.stock_id = s.id
         WHERE s.symbol = ?
         ORDER BY sp.trading_date DESC
         LIMIT 100`,
        [symbol]
    );

    if (rows.length === 0) {
        throw new Error(`Historical data unavailable for ${symbol}`);
    }

    const timeSeries = {};
    rows.forEach(r => {
        const dateStr = r.trading_date instanceof Date
            ? r.trading_date.toISOString().split("T")[0]
            : String(r.trading_date).split("T")[0];

        timeSeries[dateStr] = {
            "1. open": String(r.open_price),
            "2. high": String(r.high_price),
            "3. low": String(r.low_price),
            "4. close": String(r.close_price),
            "5. volume": String(r.volume)
        };
    });

    return timeSeries;
};

module.exports = {
    getQuote,
    getDailyHistory
};
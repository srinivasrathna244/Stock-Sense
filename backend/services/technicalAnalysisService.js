const db = require("../config/database");


/*
    Calculate Simple Moving Average
*/
function calculateSMA(values, period) {

    if (values.length < period) {
        return null;
    }

    const recentValues = values.slice(-period);

    const sum = recentValues.reduce(
        (total, value) => total + value,
        0
    );

    return sum / period;
}


/*
    Calculate Exponential Moving Average
*/
function calculateEMA(values, period) {

    if (values.length < period) {
        return null;
    }

    const multiplier = 2 / (period + 1);

    let ema =
        values
            .slice(0, period)
            .reduce((sum, value) => sum + value, 0)
        / period;

    for (let i = period; i < values.length; i++) {

        ema =
            (values[i] - ema) * multiplier + ema;
    }

    return ema;
}


/*
    Calculate RSI
*/
function calculateRSI(values, period = 14) {

    if (values.length <= period) {
        return null;
    }

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {

        const difference =
            values[i] - values[i - 1];

        if (difference > 0) {
            gains += difference;
        } else {
            losses += Math.abs(difference);
        }
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;

    for (let i = period + 1; i < values.length; i++) {

        const difference =
            values[i] - values[i - 1];

        const gain =
            difference > 0 ? difference : 0;

        const loss =
            difference < 0 ? Math.abs(difference) : 0;

        averageGain =
            ((averageGain * (period - 1)) + gain)
            / period;

        averageLoss =
            ((averageLoss * (period - 1)) + loss)
            / period;
    }

    if (averageLoss === 0) {
        return 100;
    }

    const relativeStrength =
        averageGain / averageLoss;

    return 100 -
        (100 / (1 + relativeStrength));
}


/*
    Calculate Standard Deviation
*/
function calculateStandardDeviation(values) {

    if (values.length === 0) {
        return null;
    }

    const mean =
        values.reduce(
            (sum, value) => sum + value,
            0
        ) / values.length;

    const variance =
        values.reduce(
            (sum, value) =>
                sum + Math.pow(value - mean, 2),
            0
        ) / values.length;

    return Math.sqrt(variance);
}


/*
    Calculate Bollinger Bands
*/
function calculateBollingerBands(
    values,
    period = 20
) {

    if (values.length < period) {
        return {
            upper: null,
            middle: null,
            lower: null
        };
    }

    const recentValues =
        values.slice(-period);

    const middle =
        recentValues.reduce(
            (sum, value) => sum + value,
            0
        ) / period;

    const standardDeviation =
        calculateStandardDeviation(recentValues);

    return {
        upper: middle + (2 * standardDeviation),
        middle,
        lower: middle - (2 * standardDeviation)
    };
}


/*
    Calculate MACD
*/
function calculateMACD(values) {

    if (values.length < 26) {
        return {
            macd: null,
            signal: null,
            histogram: null
        };
    }

    const ema12 = calculateEMA(values, 12);
    const ema26 = calculateEMA(values, 26);

    const macd = ema12 - ema26;

    const macdValues = [];

    for (let i = 26; i <= values.length; i++) {

        const subset = values.slice(0, i);

        const fastEMA =
            calculateEMA(subset, 12);

        const slowEMA =
            calculateEMA(subset, 26);

        macdValues.push(
            fastEMA - slowEMA
        );
    }

    let signal = null;

    if (macdValues.length >= 9) {

        signal =
            calculateEMA(macdValues, 9);
    }

    const histogram =
        signal !== null
            ? macd - signal
            : null;

    return {
        macd,
        signal,
        histogram
    };
}


/*
    Calculate indicators for ALL historical dates
*/
async function calculateAllIndicators(stockId) {

    const [rows] = await db.query(
        `SELECT
            trading_date,
            close_price
         FROM stock_prices
         WHERE stock_id = ?
         ORDER BY trading_date ASC`,
        [stockId]
    );

    if (rows.length === 0) {
        throw new Error(
            "No historical price data available"
        );
    }

    const results = [];

    for (let i = 0; i < rows.length; i++) {

        /*
            Use all prices available up to this date.
        */

        const prices = rows
            .slice(0, i + 1)
            .map(row => Number(row.close_price));


        const sma20 =
            calculateSMA(prices, 20);

        const sma50 =
            calculateSMA(prices, 50);

        const sma200 =
            calculateSMA(prices, 200);

        const ema20 =
            calculateEMA(prices, 20);

        const ema50 =
            calculateEMA(prices, 50);

        const rsi =
            calculateRSI(prices, 14);

        const macdData =
            calculateMACD(prices);

        const bollinger =
            calculateBollingerBands(
                prices,
                20
            );


        /*
            Calculate volatility
            using daily returns available
            up to this date.
        */

        const returns = [];

        for (let j = 1; j < prices.length; j++) {

            const dailyReturn =
                (prices[j] - prices[j - 1])
                / prices[j - 1];

            returns.push(dailyReturn);
        }

        const volatility =
            calculateStandardDeviation(returns);


        results.push({

            tradingDate:
                rows[i].trading_date,

            sma20,
            sma50,
            sma200,

            ema20,
            ema50,

            rsi,

            macd:
                macdData.macd,

            macdSignal:
                macdData.signal,

            macdHistogram:
                macdData.histogram,

            bollingerUpper:
                bollinger.upper,

            bollingerMiddle:
                bollinger.middle,

            bollingerLower:
                bollinger.lower,

            volatility
        });
    }

    return results;
}

/**
 * Save computed indicators array to MySQL technical_indicators table
 */
async function saveIndicatorsToDatabase(stockId, indicators) {
    for (const ind of indicators) {
        const dateStr = ind.tradingDate instanceof Date
            ? ind.tradingDate.toISOString().split("T")[0]
            : String(ind.tradingDate).split("T")[0];

        await db.query(`
            INSERT INTO technical_indicators (
                stock_id, trading_date,
                sma_20, sma_50, sma_200,
                ema_20, ema_50,
                rsi,
                macd, macd_signal, macd_histogram,
                bollinger_upper, bollinger_middle, bollinger_lower,
                volatility
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                sma_20 = VALUES(sma_20),
                sma_50 = VALUES(sma_50),
                sma_200 = VALUES(sma_200),
                ema_20 = VALUES(ema_20),
                ema_50 = VALUES(ema_50),
                rsi = VALUES(rsi),
                macd = VALUES(macd),
                macd_signal = VALUES(macd_signal),
                macd_histogram = VALUES(macd_histogram),
                bollinger_upper = VALUES(bollinger_upper),
                bollinger_middle = VALUES(bollinger_middle),
                bollinger_lower = VALUES(bollinger_lower),
                volatility = VALUES(volatility);
        `, [
            stockId,
            dateStr,
            ind.sma20,
            ind.sma50,
            ind.sma200,
            ind.ema20,
            ind.ema50,
            ind.rsi,
            ind.macd,
            ind.macdSignal,
            ind.macdHistogram,
            ind.bollingerUpper,
            ind.bollingerMiddle,
            ind.bollingerLower,
            ind.volatility
        ]);
    }
}

/**
 * Calculate and persist all indicators for a single stock
 */
async function syncAndSaveIndicators(stockId) {
    const indicators = await calculateAllIndicators(stockId);
    await saveIndicatorsToDatabase(stockId, indicators);
    return indicators;
}

/**
 * Calculate and persist indicators for all active stocks in MySQL
 */
async function syncAllStocksIndicators() {
    const [stocks] = await db.query("SELECT id, symbol FROM stocks WHERE is_active = TRUE");
    let successCount = 0;

    for (const s of stocks) {
        try {
            await syncAndSaveIndicators(s.id);
            successCount++;
        } catch (e) {
            console.warn(`Could not sync indicators for ${s.symbol}: ${e.message}`);
        }
    }
    return { total: stocks.length, success: successCount };
}

module.exports = {
    calculateAllIndicators,
    saveIndicatorsToDatabase,
    syncAndSaveIndicators,
    syncAllStocksIndicators
};
const db = require("../config/database");
const marketDataService = require("../services/marketDataService");

/**
 * Helper to ensure a user has a portfolio record
 */
const getOrCreateUserPortfolio = async (userId) => {
    const [portfolios] = await db.query(
        "SELECT id, portfolio_name, created_at FROM portfolios WHERE user_id = ? LIMIT 1",
        [userId]
    );

    if (portfolios.length > 0) {
        return portfolios[0];
    }

    const [result] = await db.query(
        "INSERT INTO portfolios (user_id, portfolio_name) VALUES (?, 'My Portfolio')",
        [userId]
    );

    return {
        id: result.insertId,
        portfolio_name: "My Portfolio",
        created_at: new Date()
    };
};

/**
 * Get user's complete portfolio summary & holdings
 */
const getPortfolio = async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolio = await getOrCreateUserPortfolio(userId);

        // Fetch all transactions for this portfolio
        const [transactions] = await db.query(
            `SELECT
                pt.id,
                pt.stock_id,
                pt.transaction_type,
                pt.quantity,
                pt.price_per_share,
                pt.transaction_date,
                s.symbol,
                s.company_name,
                s.exchange,
                s.currency
             FROM portfolio_transactions pt
             INNER JOIN stocks s ON pt.stock_id = s.id
             WHERE pt.portfolio_id = ?
             ORDER BY pt.transaction_date ASC`,
            [portfolio.id]
        );

        // Group by stock to calculate holdings
        const stockMap = {};

        for (const t of transactions) {
            const stockId = t.stock_id;
            const qty = Number(t.quantity);
            const price = Number(t.price_per_share);

            if (!stockMap[stockId]) {
                stockMap[stockId] = {
                    stockId,
                    symbol: t.symbol,
                    companyName: t.company_name,
                    exchange: t.exchange,
                    currency: t.currency,
                    totalBuyQty: 0,
                    totalBuyCost: 0,
                    totalSellQty: 0,
                    totalSellRevenue: 0,
                    transactionsCount: 0
                };
            }

            stockMap[stockId].transactionsCount++;

            if (t.transaction_type === "BUY") {
                stockMap[stockId].totalBuyQty += qty;
                stockMap[stockId].totalBuyCost += (qty * price);
            } else if (t.transaction_type === "SELL") {
                stockMap[stockId].totalSellQty += qty;
                stockMap[stockId].totalSellRevenue += (qty * price);
            }
        }

        // Calculate metrics for each holding
        const holdings = [];
        let totalPortfolioInvested = 0;
        let totalPortfolioCurrentValue = 0;

        for (const stockId of Object.keys(stockMap)) {
            const item = stockMap[stockId];
            const netQuantity = item.totalBuyQty - item.totalSellQty;

            // Only consider currently held shares (netQuantity > 0)
            if (netQuantity > 0) {
                const avgBuyPrice = item.totalBuyQty > 0
                    ? (item.totalBuyCost / item.totalBuyQty)
                    : 0;

                const investedAmount = netQuantity * avgBuyPrice;

                // Get current market price
                let currentPrice = avgBuyPrice;
                let dailyChangePercent = "0.00%";
                try {
                    const quote = await marketDataService.getQuote(item.symbol);
                    if (quote && quote.price) {
                        currentPrice = quote.price;
                        dailyChangePercent = quote.changePercent || "0.00%";
                    }
                } catch (qErr) {
                    console.warn(`Quote error for portfolio stock ${item.symbol}:`, qErr.message);
                }

                const currentValue = netQuantity * currentPrice;
                const profitLoss = currentValue - investedAmount;
                const profitLossPercent = investedAmount > 0
                    ? ((profitLoss / investedAmount) * 100)
                    : 0;

                totalPortfolioInvested += investedAmount;
                totalPortfolioCurrentValue += currentValue;

                holdings.push({
                    stockId: item.stockId,
                    symbol: item.symbol,
                    companyName: item.companyName,
                    exchange: item.exchange,
                    currency: item.currency,
                    quantity: netQuantity,
                    avgBuyPrice: Number(avgBuyPrice.toFixed(2)),
                    currentPrice: Number(currentPrice.toFixed(2)),
                    investedAmount: Number(investedAmount.toFixed(2)),
                    currentValue: Number(currentValue.toFixed(2)),
                    profitLoss: Number(profitLoss.toFixed(2)),
                    profitLossPercent: Number(profitLossPercent.toFixed(2)),
                    dailyChangePercent
                });
            }
        }

        const totalProfitLoss = totalPortfolioCurrentValue - totalPortfolioInvested;
        const totalReturnPercent = totalPortfolioInvested > 0
            ? ((totalProfitLoss / totalPortfolioInvested) * 100)
            : 0;

        res.status(200).json({
            success: true,
            portfolio: {
                id: portfolio.id,
                name: portfolio.portfolio_name,
                summary: {
                    totalInvested: Number(totalPortfolioInvested.toFixed(2)),
                    currentValue: Number(totalPortfolioCurrentValue.toFixed(2)),
                    totalProfitLoss: Number(totalProfitLoss.toFixed(2)),
                    totalReturnPercent: Number(totalReturnPercent.toFixed(2)),
                    holdingsCount: holdings.length,
                    transactionsCount: transactions.length
                },
                holdings
            }
        });

    } catch (error) {
        console.error("Get portfolio error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch portfolio"
        });
    }
};

/**
 * Add a buy or sell transaction
 */
const addTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            symbol,
            transaction_type,
            quantity,
            price_per_share,
            transaction_date
        } = req.body;

        if (!symbol || !transaction_type || !quantity || !price_per_share) {
            return res.status(400).json({
                success: false,
                message: "Symbol, transaction type, quantity, and price per share are required"
            });
        }

        const type = transaction_type.toUpperCase();
        if (type !== "BUY" && type !== "SELL") {
            return res.status(400).json({
                success: false,
                message: "Transaction type must be BUY or SELL"
            });
        }

        const qty = Number(quantity);
        const price = Number(price_per_share);

        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive number"
            });
        }

        if (isNaN(price) || price <= 0) {
            return res.status(400).json({
                success: false,
                message: "Price per share must be a positive number"
            });
        }

        // Find stock
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
        const portfolio = await getOrCreateUserPortfolio(userId);

        // If SELL, check if user has enough shares
        if (type === "SELL") {
            const [txs] = await db.query(
                `SELECT transaction_type, quantity
                 FROM portfolio_transactions
                 WHERE portfolio_id = ? AND stock_id = ?`,
                [portfolio.id, stock.id]
            );

            let ownedQty = 0;
            txs.forEach(t => {
                if (t.transaction_type === "BUY") ownedQty += Number(t.quantity);
                if (t.transaction_type === "SELL") ownedQty -= Number(t.quantity);
            });

            if (qty > ownedQty) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient shares. You currently own ${ownedQty} shares of ${stock.symbol}`
                });
            }
        }

        const txDate = transaction_date ? new Date(transaction_date) : new Date();

        const [result] = await db.query(
            `INSERT INTO portfolio_transactions
            (portfolio_id, stock_id, transaction_type, quantity, price_per_share, transaction_date)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                portfolio.id,
                stock.id,
                type,
                qty,
                price,
                txDate
            ]
        );

        res.status(201).json({
            success: true,
            message: `Transaction recorded successfully (${type} ${qty} shares of ${stock.symbol})`,
            transaction: {
                id: result.insertId,
                portfolioId: portfolio.id,
                stockId: stock.id,
                symbol: stock.symbol,
                companyName: stock.company_name,
                transactionType: type,
                quantity: qty,
                pricePerShare: price,
                totalAmount: Number((qty * price).toFixed(2)),
                transactionDate: txDate
            }
        });

    } catch (error) {
        console.error("Add transaction error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to record transaction"
        });
    }
};

/**
 * Get all transaction history
 */
const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolio = await getOrCreateUserPortfolio(userId);

        const [transactions] = await db.query(
            `SELECT
                pt.id,
                pt.transaction_type,
                pt.quantity,
                pt.price_per_share,
                (pt.quantity * pt.price_per_share) as total_amount,
                pt.transaction_date,
                s.id as stock_id,
                s.symbol,
                s.company_name,
                s.exchange,
                s.currency
             FROM portfolio_transactions pt
             INNER JOIN stocks s ON pt.stock_id = s.id
             WHERE pt.portfolio_id = ?
             ORDER BY pt.transaction_date DESC, pt.id DESC`,
            [portfolio.id]
        );

        res.status(200).json({
            success: true,
            count: transactions.length,
            transactions: transactions.map(t => ({
                id: t.id,
                stockId: t.stock_id,
                symbol: t.symbol,
                companyName: t.company_name,
                exchange: t.exchange,
                currency: t.currency,
                transactionType: t.transaction_type,
                quantity: Number(t.quantity),
                pricePerShare: Number(t.price_per_share),
                totalAmount: Number(Number(t.total_amount).toFixed(2)),
                transactionDate: t.transaction_date
            }))
        });

    } catch (error) {
        console.error("Get transactions error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch transactions"
        });
    }
};

/**
 * Delete a transaction
 */
const deleteTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const txId = req.params.id;
        const portfolio = await getOrCreateUserPortfolio(userId);

        const [result] = await db.query(
            "DELETE FROM portfolio_transactions WHERE id = ? AND portfolio_id = ?",
            [txId, portfolio.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found or unauthorized"
            });
        }

        res.status(200).json({
            success: true,
            message: "Transaction deleted successfully"
        });

    } catch (error) {
        console.error("Delete transaction error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to delete transaction"
        });
    }
};

module.exports = {
    getPortfolio,
    addTransaction,
    getTransactions,
    deleteTransaction
};

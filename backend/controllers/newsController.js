const db = require("../config/database");

/**
 * Get news for a specific stock or general financial news
 */
const getStockNews = async (req, res) => {
    try {
        const { symbol } = req.params;

        let query = `
            SELECT
                n.id,
                n.title,
                n.description,
                n.source,
                n.article_url,
                n.published_at,
                n.sentiment,
                n.sentiment_score,
                s.symbol,
                s.company_name
            FROM news n
            LEFT JOIN stocks s ON n.stock_id = s.id
        `;

        const queryParams = [];

        if (symbol && symbol !== "all") {
            query += " WHERE s.symbol = ? ";
            queryParams.push(symbol);
        }

        query += " ORDER BY n.published_at DESC LIMIT 20";

        const [newsItems] = await db.query(query, queryParams);

        if (newsItems.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                news: [],
                message: "No recent news available."
            });
        }

        res.status(200).json({
            success: true,
            count: newsItems.length,
            news: newsItems
        });

    } catch (error) {
        console.error("Get news error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch news"
        });
    }
};

module.exports = {
    getStockNews
};

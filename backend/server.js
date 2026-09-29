const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const db = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const stockRoutes = require("./routes/stockRoutes");
const watchlistRoutes = require("./routes/watchlistRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const marketRoutes = require("./routes/marketRoutes");
const newsRoutes = require("./routes/newsRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(helmet({
    contentSecurityPolicy: false // Allows inline scripts & Chart.js CDN for development
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, "../frontend")));

// ============================================================
// API ROUTES
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/ai", aiRoutes);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", async (req, res) => {
    try {
        const [result] = await db.query("SELECT 1 AS database_status");

        res.status(200).json({
            success: true,
            message: "StockSense backend is running",
            database: result[0].database_status === 1
                ? "Connected"
                : "Not Connected"
        });

    } catch (error) {
        console.error("Database connection error:", error.message);
        res.status(500).json({
            success: false,
            message: "Backend is running, but database connection failed"
        });
    }
});

// Root API Endpoint
app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to StockSense API",
        version: "1.0.0"
    });
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(`StockSense server running on http://localhost:${PORT}`);
});
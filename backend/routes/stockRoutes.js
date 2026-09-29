const express = require("express");

const {
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
} = require("../controllers/stockController");

const router = express.Router();

// Static routes
router.get("/", getAllStocks);
router.get("/search", searchStocks);
router.get("/sectors", getSectors);
router.get("/discovery", getStockDiscovery);
router.get("/compare", compareStocks);

// Parameterized routes
router.get("/:symbol/prediction", getStockPrediction);
router.post("/:symbol/sync-history", syncStockHistory);
router.get("/:symbol/history", getStockHistory);
router.get("/:symbol/technical-indicators", getTechnicalIndicators);
router.get("/:symbol/analysis", getStockAnalysis);
router.get("/:symbol", getStockDetails);

module.exports = router;
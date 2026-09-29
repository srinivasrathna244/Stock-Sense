const express = require("express");
const {
    getStockPrediction,
    chat
} = require("../controllers/aiController");

const router = express.Router();

router.get("/predict/:stockId", getStockPrediction);
router.post("/chat", chat);

module.exports = router;
const express = require("express");
const {
    getPortfolio,
    addTransaction,
    getTransactions,
    deleteTransaction
} = require("../controllers/portfolioController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getPortfolio);
router.post("/transaction", addTransaction);
router.get("/transactions", getTransactions);
router.delete("/transaction/:id", deleteTransaction);

module.exports = router;

const express = require("express");
const { getMarketIndices } = require("../controllers/marketController");

const router = express.Router();

router.get("/indices", getMarketIndices);

module.exports = router;

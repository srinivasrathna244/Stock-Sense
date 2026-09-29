const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const db = require("./config/database");
const authService = require("./services/authService");
const technicalAnalysisService = require("./services/technicalAnalysisService");
const marketDataService = require("./services/marketDataService");
const aiAssistantService = require("./services/aiAssistantService");

async function runTests() {
    console.log("==================================================");
    console.log("  STOCKSENSE COMPREHENSIVE VERIFICATION SUITE");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;

    function assert(name, condition, extra = "") {
        if (condition) {
            console.log(`[PASS] ${name} ${extra}`);
            passed++;
        } else {
            console.error(`[FAIL] ${name} ${extra}`);
            failed++;
        }
    }

    try {
        // 1. Database Connection Check
        const [dbCheck] = await db.query("SELECT 1 as connected");
        assert("Database Connection", dbCheck[0].connected === 1);

        // 2. Stock Records Check
        const [stocks] = await db.query("SELECT id, symbol, company_name FROM stocks WHERE is_active = TRUE");
        assert("Stocks in Database", stocks.length >= 8, `(${stocks.length} stocks found)`);

        // 3. Stock Prices Check
        const [prices] = await db.query("SELECT count(*) as total_prices FROM stock_prices");
        assert("Historical Prices Populated", prices[0].total_prices >= 800, `(${prices[0].total_prices} rows)`);

        // 4. Technical Analysis Service Check
        const stock1 = stocks[0];
        const indicators = await technicalAnalysisService.calculateAllIndicators(stock1.id);
        assert("Technical Indicators Calculation", indicators.length > 0, `(${indicators.length} dates calculated)`);

        const latestInd = indicators[indicators.length - 1];
        assert("RSI Calculated", latestInd.rsi !== null && latestInd.rsi >= 0 && latestInd.rsi <= 100, `(RSI: ${latestInd.rsi ? latestInd.rsi.toFixed(2) : 'N/A'})`);
        assert("SMA20 Calculated", latestInd.sma20 !== null, `(SMA20: ${latestInd.sma20 ? latestInd.sma20.toFixed(2) : 'N/A'})`);
        assert("MACD Calculated", latestInd.macd !== null, `(MACD: ${latestInd.macd ? latestInd.macd.toFixed(4) : 'N/A'})`);
        assert("Bollinger Bands Calculated", latestInd.bollingerUpper !== null && latestInd.bollingerLower !== null);

        // 5. Market Data Fallback Check
        const quote = await marketDataService.getQuote(stock1.symbol);
        assert("Market Data Quote Resolution", quote && quote.price > 0, `(Price: ₹${quote.price})`);

        // 6. User Auth Service Check (Register, Login, Token)
        const testEmail = `test_${Date.now()}@stocksense.com`;
        const regUser = await authService.registerUser({
            first_name: "Test",
            last_name: "Engineer",
            email: testEmail,
            phone: "9876543210",
            password: "SecurePassword123"
        });
        assert("User Registration", regUser && regUser.id > 0, `(User ID: ${regUser.id})`);

        // Duplicate Email Rejection Check
        let dupFailed = false;
        try {
            await authService.registerUser({
                first_name: "Test2",
                email: testEmail,
                password: "password123"
            });
        } catch (e) {
            dupFailed = true;
        }
        assert("Duplicate Email Rejection", dupFailed);

        // Login Check
        const loggedUser = await authService.loginUser(testEmail, "SecurePassword123");
        assert("User Login Verification", loggedUser && loggedUser.email === testEmail);

        // Wrong Password Check
        let wrongPassFailed = false;
        try {
            await authService.loginUser(testEmail, "WrongPassword");
        } catch (e) {
            wrongPassFailed = true;
        }
        assert("Invalid Password Rejection", wrongPassFailed);

        // 7. Watchlist DB Operations Check
        await db.query("INSERT INTO watchlists (user_id, stock_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP", [regUser.id, stock1.id]);
        const [wl] = await db.query("SELECT * FROM watchlists WHERE user_id = ?", [regUser.id]);
        assert("Watchlist Persistence", wl.length === 1, `(Watchlist item count: ${wl.length})`);
        await db.query("DELETE FROM watchlists WHERE user_id = ?", [regUser.id]);

        // 8. Portfolio & Transaction Calculations Check
        const [portResult] = await db.query("INSERT INTO portfolios (user_id, portfolio_name) VALUES (?, 'Test Portfolio')", [regUser.id]);
        const portfolioId = portResult.insertId;

        // Add Buy Transaction (10 shares @ ₹2500)
        await db.query(
            "INSERT INTO portfolio_transactions (portfolio_id, stock_id, transaction_type, quantity, price_per_share) VALUES (?, ?, 'BUY', 10, 2500)",
            [portfolioId, stock1.id]
        );

        const [txs] = await db.query("SELECT * FROM portfolio_transactions WHERE portfolio_id = ?", [portfolioId]);
        assert("Portfolio Buy Transaction Recorded", txs.length === 1);

        // 9. AI Assistant Service Check (Educational & Stock Context)
        const rsiResponse = await aiAssistantService.generateResponse("What is RSI?");
        assert("AI Assistant Educational Query (RSI)", rsiResponse.reply.includes("Relative Strength Index") && rsiResponse.disclaimer);

        const stockResponse = await aiAssistantService.generateResponse(`Analyze ${stock1.symbol}`);
        assert("AI Assistant Stock Context Query", stockResponse.hasStockContext && stockResponse.reply.includes(stock1.symbol));
        assert("Financial Safety Disclaimer Attached", stockResponse.disclaimer && stockResponse.disclaimer.length > 10);

        // Cleanup test user & portfolio
        await db.query("DELETE FROM users WHERE id = ?", [regUser.id]);

        console.log("==================================================");
        console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
        console.log("==================================================");

        if (failed === 0) {
            console.log("🎉 ALL BACKEND & DATABASE TESTS PASSED!");
            process.exit(0);
        } else {
            console.error("❌ SOME TESTS FAILED!");
            process.exit(1);
        }

    } catch (err) {
        console.error("Test Suite Error:", err);
        process.exit(1);
    }
}

runTests();

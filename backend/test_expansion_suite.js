const axios = require("axios");

const BASE_URL = "http://localhost:5000";

async function runExpansionVerification() {
    console.log("==================================================");
    console.log("  STOCKSENSE EXPANSION & AI SUITE VERIFICATION");
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
        // 1. Health & Database
        const health = await axios.get(`${BASE_URL}/api/health`);
        assert("Backend & MySQL Database Connected", health.data.success && health.data.database === "Connected");

        // 2. Expanded Stock Catalog
        const catalogRes = await axios.get(`${BASE_URL}/api/stocks?limit=100`);
        assert("Expanded Stock Catalog Loaded", catalogRes.data.success && catalogRes.data.total >= 50, `(Total: ${catalogRes.data.total} stocks)`);

        // 3. Sectors List
        const sectorsRes = await axios.get(`${BASE_URL}/api/stocks/sectors`);
        assert("Sectors Discovery API", sectorsRes.data.success && sectorsRes.data.count >= 10, `(${sectorsRes.data.count} distinct sectors)`);

        // 4. Multi-parameter Search & Filter
        const searchRes = await axios.get(`${BASE_URL}/api/stocks?q=Tata`);
        assert("Search by Company Name/Keyword ('Tata')", searchRes.data.success && searchRes.data.count >= 3, `(${searchRes.data.count} matches)`);

        const sectorFilterRes = await axios.get(`${BASE_URL}/api/stocks?sector=Healthcare`);
        assert("Filter by Sector ('Healthcare')", sectorFilterRes.data.success && sectorFilterRes.data.count >= 4, `(${sectorFilterRes.data.count} stocks)`);

        const capFilterRes = await axios.get(`${BASE_URL}/api/stocks?category=Mid Cap`);
        assert("Filter by Market Cap ('Mid Cap')", capFilterRes.data.success && capFilterRes.data.count >= 5, `(${capFilterRes.data.count} stocks)`);

        // 5. Stock Discovery API (Gainers, Losers, Active)
        const discoveryRes = await axios.get(`${BASE_URL}/api/stocks/discovery`);
        assert("Stock Discovery API (Gainers, Losers, Active)", discoveryRes.data.success && Array.isArray(discoveryRes.data.topGainers) && Array.isArray(discoveryRes.data.topLosers));

        // 6. Stock Details & Technical Indicators
        const stockDetailRes = await axios.get(`${BASE_URL}/api/stocks/TCS.BSE/analysis`);
        assert("Stock Analysis & 13 Technical Indicators (TCS.BSE)", stockDetailRes.data.success && stockDetailRes.data.technicalIndicators && stockDetailRes.data.technicalIndicators.rsi !== null, `(RSI: ${stockDetailRes.data.technicalIndicators.rsi})`);

        // 7. Multi-Stock AI Model Prediction
        const tcsPred = await axios.get(`${BASE_URL}/api/stocks/TCS.BSE/prediction`);
        assert("AI Model Prediction for TCS.BSE", tcsPred.data.success && (tcsPred.data.prediction === "UP" || tcsPred.data.prediction === "DOWN"), `(Direction: ${tcsPred.data.prediction}, Confidence: ${tcsPred.data.confidence})`);

        const relPred = await axios.get(`${BASE_URL}/api/stocks/RELIANCE.BSE/prediction`);
        assert("AI Model Prediction for RELIANCE.BSE", relPred.data.success && (relPred.data.prediction === "UP" || relPred.data.prediction === "DOWN"), `(Direction: ${relPred.data.prediction}, Confidence: ${relPred.data.confidence})`);

        const tatamotorsPred = await axios.get(`${BASE_URL}/api/stocks/TATAMOTORS.BSE/prediction`);
        assert("AI Model Prediction for Newly Seeded Stock (TATAMOTORS.BSE)", tatamotorsPred.data.success && !!tatamotorsPred.data.prediction, `(Direction: ${tatamotorsPred.data.prediction}, Confidence: ${tatamotorsPred.data.confidence})`);

        // 8. Stock Comparison API
        const compareRes = await axios.get(`${BASE_URL}/api/stocks/compare?symbols=TCS.BSE,INFY.BSE`);
        assert("Stock Comparison API (TCS.BSE vs INFY.BSE)", compareRes.data.success && compareRes.data.count === 2 && compareRes.data.comparison.length === 2);

        // 9. Conversational AI Assistant: Natural Language Query
        const chatNatRes = await axios.post(`${BASE_URL}/api/ai/chat`, {
            message: "What is happening with TCS?"
        });
        assert("Conversational AI: Natural Language Query ('What is happening with TCS?')", chatNatRes.data.success && chatNatRes.data.hasStockContext && chatNatRes.data.reply.includes("Tata Consultancy Services") && Array.isArray(chatNatRes.data.suggestedPrompts));

        // 10. Conversational AI Assistant: "Why Buy?" & Risk Evaluation
        const chatWhyRes = await axios.post(`${BASE_URL}/api/ai/chat`, {
            message: "Should I buy Reliance stock right now?"
        });
        assert("Conversational AI: Risk & Objective Evaluation Query", chatWhyRes.data.success && chatWhyRes.data.hasStockContext && chatWhyRes.data.reply.includes("Reliance") && chatWhyRes.data.reply.includes("Risk"));

        // 11. Conversational AI Assistant: Stock Comparison Query
        const chatCompRes = await axios.post(`${BASE_URL}/api/ai/chat`, {
            message: "Compare TCS and INFY"
        });
        assert("Conversational AI: Natural Language Stock Comparison ('Compare TCS and INFY')", chatCompRes.data.success && chatCompRes.data.symbols && chatCompRes.data.symbols.length === 2 && chatCompRes.data.reply.includes("Tata Consultancy Services") && chatCompRes.data.reply.includes("Infosys"));

        // 12. Conversational AI Assistant: Multilingual Telugu Query
        const chatTeluguRes = await axios.post(`${BASE_URL}/api/ai/chat`, {
            message: "RSI ante enti? Naaku Telugu lo cheppu"
        });
        assert("Conversational AI: Multilingual Telugu Query ('RSI ante enti?')", chatTeluguRes.data.success && chatTeluguRes.data.reply.length > 50 && (chatTeluguRes.data.reply.includes("సూచిక") || chatTeluguRes.data.reply.includes("మొమెంటమ్") || chatTeluguRes.data.reply.includes("Relative Strength Index")));

        // 13. Conversational AI Assistant: Telugu Stock Analysis Query
        const chatTeluguStockRes = await axios.post(`${BASE_URL}/api/ai/chat`, {
            message: "TCS prediction enduku UP undi?"
        });
        assert("Conversational AI: Telugu Stock Analysis ('TCS prediction enduku UP undi?')", chatTeluguStockRes.data.success && chatTeluguStockRes.data.hasStockContext && chatTeluguStockRes.data.reply.includes("TCS"));

        // 14. Conversational AI Assistant: Conversation Memory & Context Follow-up
        const chatFollowUpRes = await axios.post(`${BASE_URL}/api/ai/chat`, {
            message: "Why is the prediction showing this?",
            conversationHistory: [
                { role: "user", content: "Analyze TCS" },
                { role: "assistant", content: "TCS analysis...", symbol: "TCS.BSE" }
            ]
        });
        assert("Conversational AI: Conversation Memory & Follow-up ('Why is the prediction showing this?')", chatFollowUpRes.data.success && chatFollowUpRes.data.symbol === "TCS.BSE" && chatFollowUpRes.data.reply.includes("Tata Consultancy Services"));

        // 15. Financial Safety Disclaimer Enforcement
        assert("Financial Safety Disclaimer Attached to All AI Responses", !!chatNatRes.data.disclaimer && !!chatTeluguRes.data.disclaimer && !!chatCompRes.data.disclaimer);

        console.log("==================================================");
        console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
        console.log("==================================================");

        if (failed === 0) {
            console.log("🎉 ALL EXPANSION & CONVERSATIONAL AI TESTS PASSED!");
            process.exit(0);
        } else {
            console.error("❌ SOME TESTS FAILED!");
            process.exit(1);
        }

    } catch (err) {
        console.error("Verification suite execution error:", err.message);
        if (err.response) {
            console.error("Response data:", err.response.data);
        }
        process.exit(1);
    }
}

runExpansionVerification();

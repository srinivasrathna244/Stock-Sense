const axios = require("axios");

const BASE_URL = "http://localhost:5000";

async function testAuthFlow() {
    console.log("==================================================");
    console.log("  STOCKSENSE AUTHENTICATION & ENTRY FLOW TEST");
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
        // 1. Root route inspection
        const rootRes = await axios.get(`${BASE_URL}/`);
        assert("Root (/) serves entry router", rootRes.status === 200);
        assert("Root (/) contains unauthenticated redirect to login.html", rootRes.data.includes('login.html'));
        assert("Root (/) contains authenticated redirect to dashboard.html", rootRes.data.includes('dashboard.html'));

        // 2. Protected dashboard page inspection
        const dashRes = await axios.get(`${BASE_URL}/dashboard.html`);
        assert("Dashboard (/dashboard.html) contains requireAuth() protection", dashRes.data.includes('requireAuth'));

        // 3. Protected pages inspection
        const stockRes = await axios.get(`${BASE_URL}/stock.html`);
        assert("Stock Details (/stock.html) contains requireAuth() protection", stockRes.data.includes('requireAuth'));

        const wlRes = await axios.get(`${BASE_URL}/watchlist.html`);
        assert("Watchlist (/watchlist.html) contains requireAuth() protection", wlRes.data.includes('requireAuth'));

        const portRes = await axios.get(`${BASE_URL}/portfolio.html`);
        assert("Portfolio (/portfolio.html) contains requireAuth() protection", portRes.data.includes('requireAuth'));

        const aiRes = await axios.get(`${BASE_URL}/ai-chat.html`);
        assert("AI Assistant (/ai-chat.html) contains requireAuth() protection", aiRes.data.includes('requireAuth'));

        // 4. Registration flow
        const ts = Date.now();
        const testUser = {
            first_name: "Flow",
            last_name: "Tester",
            email: `flow_${ts}@stocksense.com`,
            phone: `+91${ts.toString().slice(-10)}`,
            password: "SecurePassword123"
        };

        const regRes = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
        assert("User Registration succeeds", regRes.data.success === true && regRes.data.user.email === testUser.email);

        // 5. Login flow
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        assert("User Login succeeds & returns JWT token", loginRes.data.success === true && !!loginRes.data.token);
        const token = loginRes.data.token;

        // 6. Authenticated User Profile API
        const meRes = await axios.get(`${BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        assert("Authenticated Profile (/api/auth/me) returns user details", meRes.data.success === true && meRes.data.user.email === testUser.email);

        // 7. Protected Watchlist API with token
        const wlAddRes = await axios.post(`${BASE_URL}/api/watchlist`, { symbol: "INFY.BSE" }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        assert("Watchlist Add succeeds for authenticated user", wlAddRes.data.success === true);

        // 8. Protected Portfolio API with token
        const portTxRes = await axios.post(`${BASE_URL}/api/portfolio/transaction`, {
            symbol: "INFY.BSE",
            transaction_type: "BUY",
            quantity: 5,
            price_per_share: 1750
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        assert("Portfolio Transaction succeeds for authenticated user", portTxRes.data.success === true);

        // 9. Unauthorized request rejection check
        let unauthRejected = false;
        try {
            await axios.get(`${BASE_URL}/api/watchlist`);
        } catch (e) {
            unauthRejected = e.response && e.response.status === 401;
        }
        assert("Unauthenticated API request receives 401 Unauthorized", unauthRejected);

        // 10. AI Assistant Chat works
        const chatRes = await axios.post(`${BASE_URL}/api/ai/chat`, {
            message: "What is RSI?"
        });
        assert("AI Assistant responds to educational queries", chatRes.data.success === true && chatRes.data.reply.includes("Relative Strength Index"));

        console.log("==================================================");
        console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
        console.log("==================================================");

        if (failed === 0) {
            console.log("🎉 ALL AUTHENTICATION & ROUTING FLOW TESTS PASSED!");
            process.exit(0);
        } else {
            console.error("❌ SOME TESTS FAILED!");
            process.exit(1);
        }

    } catch (err) {
        console.error("Auth flow test error:", err.message);
        process.exit(1);
    }
}

testAuthFlow();

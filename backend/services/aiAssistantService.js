const db = require("../config/database");
const marketDataService = require("./marketDataService");
const axios = require("axios");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// Comprehensive Technical & Financial Knowledge Base
const EDUCATIONAL_KNOWLEDGE = {
    rsi: {
        title: "Relative Strength Index (RSI)",
        explanation: "RSI is a momentum oscillator measuring price speed and change on a 0–100 scale. Generally, **RSI > 70** indicates an overbought condition (potential pullback/consolidation risk), **RSI < 30** indicates an oversold condition (potential value rebound), and **30–70** signifies neutral momentum."
    },
    macd: {
        title: "Moving Average Convergence Divergence (MACD)",
        explanation: "MACD is a trend-following momentum indicator tracking the relationship between two moving averages (12-day and 26-day EMAs). A **bullish crossover** occurs when the MACD line crosses above the 9-day Signal line. A **bearish crossover** occurs when MACD falls below the Signal line. The Histogram represents momentum magnitude."
    },
    sma: {
        title: "Simple Moving Average (SMA)",
        explanation: "SMA calculates the arithmetic average price over a specific window (e.g., 20 days for short-term trend, 50 days for medium-term, 200 days for primary trend). When price trades **above its SMA**, upward trend momentum is confirmed; trading **below SMA** signals weakness. A Golden Cross (SMA 50 crossing above SMA 200) is a major bullish milestone."
    },
    ema: {
        title: "Exponential Moving Average (EMA)",
        explanation: "EMA applies exponential weighting to recent prices, making it much more responsive to sudden price swings than an SMA. Traders use EMA 20 and EMA 50 to detect early trend reversals and dynamic support/resistance zones."
    },
    bollinger: {
        title: "Bollinger Bands",
        explanation: "Bollinger Bands plot 2 standard deviations above and below a 20-day SMA. Band narrowing (a **Squeeze**) signals low volatility preceding a potential breakout. Touching the upper band suggests extended prices; touching the lower band points to support."
    },
    volatility: {
        title: "Market Volatility",
        explanation: "Volatility quantifies historical price dispersion. Higher volatility indicates wider price swings and higher risk/reward ratios, while low volatility suggests price stability."
    },
    prediction: {
        title: "How StockSense Calculates AI Predictions",
        explanation: "StockSense utilizes a supervised **Random Forest Classifier** trained on historical market data and 13 technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, and Volatility). The model evaluates current indicator configurations to estimate the directional probability (UP vs DOWN) for the next trading session."
    },
    confidence: {
        title: "Prediction Confidence Score",
        explanation: "The confidence score is the classification probability (50% to 100%) assigned by the Random Forest ensemble. Higher confidence reflects stronger agreement among decision trees based on historical statistical patterns."
    }
};

// Aliases mapping colloquial names to symbol roots
const STOCK_NAME_MAP = {
    "reliance": "RELIANCE.BSE",
    "ril": "RELIANCE.BSE",
    "tcs": "TCS.BSE",
    "tata consultancy": "TCS.BSE",
    "infosys": "INFY.BSE",
    "infy": "INFY.BSE",
    "wipro": "WIPRO.BSE",
    "hcl": "HCLTECH.BSE",
    "hcl tech": "HCLTECH.BSE",
    "tech mahindra": "TECHM.BSE",
    "techm": "TECHM.BSE",
    "ltim": "LTIM.BSE",
    "ltimindtree": "LTIM.BSE",
    "persistent": "PERSISTENT.BSE",
    "coforge": "COFORGE.BSE",
    "hdfc": "HDFCBANK.BSE",
    "hdfc bank": "HDFCBANK.BSE",
    "icici": "ICICIBANK.BSE",
    "icici bank": "ICICIBANK.BSE",
    "sbi": "SBIN.BSE",
    "sbin": "SBIN.BSE",
    "state bank": "SBIN.BSE",
    "kotak": "KOTAKBANK.BSE",
    "kotak bank": "KOTAKBANK.BSE",
    "axis": "AXISBANK.BSE",
    "axis bank": "AXISBANK.BSE",
    "indusind": "INDUSINDBK.BSE",
    "bank of baroda": "BANKBARODA.BSE",
    "bob": "BANKBARODA.BSE",
    "federal bank": "FEDERALBNK.BSE",
    "idfc": "IDFCFIRSTB.BSE",
    "idfc first": "IDFCFIRSTB.BSE",
    "bajaj finance": "BAJFINANCE.BSE",
    "bajfinance": "BAJFINANCE.BSE",
    "bajaj finserv": "BAJAJFINSV.BSE",
    "chola": "CHOLAFIN.BSE",
    "cholamandalam": "CHOLAFIN.BSE",
    "muthoot": "MUTHOOTFIN.BSE",
    "tata motors": "TATAMOTORS.BSE",
    "tatamotors": "TATAMOTORS.BSE",
    "maruti": "MARUTI.BSE",
    "maruti suzuki": "MARUTI.BSE",
    "m&m": "M&M.BSE",
    "mahindra": "M&M.BSE",
    "bajaj auto": "BAJAJ-AUTO.BSE",
    "hero": "HEROMOTOCO.BSE",
    "hero motocorp": "HEROMOTOCO.BSE",
    "tvs": "TVSMOTOR.BSE",
    "tvs motor": "TVSMOTOR.BSE",
    "sun pharma": "SUNPHARMA.BSE",
    "sunpharma": "SUNPHARMA.BSE",
    "dr reddy": "DRREDDY.BSE",
    "drreddy": "DRREDDY.BSE",
    "cipla": "CIPLA.BSE",
    "divi": "DIVISLAB.BSE",
    "divis": "DIVISLAB.BSE",
    "apollo": "APOLLOHOSP.BSE",
    "apollo hospitals": "APOLLOHOSP.BSE",
    "lupin": "LUPIN.BSE",
    "biocon": "BIOCON.BSE",
    "ongc": "ONGC.BSE",
    "bpcl": "BPCL.BSE",
    "ioc": "IOC.BSE",
    "gail": "GAIL.BSE",
    "coal india": "COALINDIA.BSE",
    "itc": "ITC.BSE",
    "hul": "HINDUNILVR.BSE",
    "hindustan unilever": "HINDUNILVR.BSE",
    "nestle": "NESTLEIND.BSE",
    "britannia": "BRITANNIA.BSE",
    "dabur": "DABUR.BSE",
    "tata consumer": "TATACONSUM.BSE",
    "tata steel": "TATASTEEL.BSE",
    "tatasteel": "TATASTEEL.BSE",
    "jsw": "JSWSTEEL.BSE",
    "jsw steel": "JSWSTEEL.BSE",
    "hindalco": "HINDALCO.BSE",
    "vedanta": "VEDL.BSE",
    "vedl": "VEDL.BSE",
    "jindal": "JINDALSTEL.BSE",
    "jindal steel": "JINDALSTEL.BSE",
    "lt": "LT.BSE",
    "l&t": "LT.BSE",
    "larsen": "LT.BSE",
    "ultratech": "ULTRACEMCO.BSE",
    "grasim": "GRASIM.BSE",
    "adani ports": "ADANIPORTS.BSE",
    "ntpc": "NTPC.BSE",
    "power grid": "POWERGRID.BSE",
    "powergrid": "POWERGRID.BSE",
    "tata power": "TATAPOWER.BSE",
    "tatapower": "TATAPOWER.BSE",
    "adani green": "ADANIGREEN.BSE",
    "suzlon": "SUZLON.BSE",
    "hal": "HAL.BSE",
    "bel": "BEL.BSE",
    "bdl": "BDL.BSE",
    "mazagon": "MAZDOCK.BSE",
    "pidilite": "PIDILITIND.BSE",
    "srf": "SRF.BSE",
    "aarti": "AARTIIND.BSE",
    "tata chemicals": "TATACHEM.BSE",
    "dmart": "DMART.BSE",
    "trent": "TRENT.BSE",
    "zomato": "ZOMATO.BSE",
    "nykaa": "NYKAA.BSE",
    "airtel": "BHARTIARTL.BSE",
    "bharti airtel": "BHARTIARTL.BSE",
    "tata comm": "TATACOMM.BSE"
};

/**
 * Extract multiple stock symbols mentioned in natural user query
 */
const extractStockSymbols = async (query, explicitSymbol = null) => {
    const symbols = new Set();
    if (explicitSymbol) symbols.add(explicitSymbol.toUpperCase());

    const lower = query.toLowerCase();

    // Check alias dictionary
    for (const [alias, sym] of Object.entries(STOCK_NAME_MAP)) {
        // Regex word boundary matching to avoid partial substring false positives
        const regex = new RegExp(`\\b${alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lower)) {
            symbols.add(sym);
        }
    }

    // Check database exact symbol matching (e.g. "TCS.BSE" or "TCS")
    const [stocks] = await db.query("SELECT id, symbol, company_name FROM stocks WHERE is_active = TRUE");
    for (const s of stocks) {
        const root = s.symbol.split(".")[0].toLowerCase();
        const rootRegex = new RegExp(`\\b${root}\\b`, 'i');
        if (rootRegex.test(lower) || lower.includes(s.symbol.toLowerCase())) {
            symbols.add(s.symbol);
        }
    }

    return Array.from(symbols);
};

/**
 * Detect language: English, Telugu, or code-mixed
 */
const detectLanguage = (text) => {
    const teluguChars = /[\u0C00-\u0C7F]/;
    const teluguTranslitWords = [
        "ante", "enti", "cheppu", "enduku", "undhi", "undi", "ela", "emi",
        "chesindi", "perigindi", "taggindi", "naaku", "chudu", "gurinchi",
        "telugu", "telugulo", "telusuko", "anni", "bavunda", "cheyyi"
    ];

    if (teluguChars.test(text)) return "telugu";

    const lower = text.toLowerCase();
    for (const w of teluguTranslitWords) {
        const reg = new RegExp(`\\b${w}\\b`, 'i');
        if (reg.test(lower)) return "telugu";
    }

    return "english";
};

/**
 * Detect User Intent
 */
const detectIntent = (text, symbols) => {
    const lower = text.toLowerCase();

    if (symbols.length >= 2 || lower.includes("compare") || lower.includes("vs") || lower.includes("better between") || lower.includes("difference between")) {
        if (symbols.length >= 2 || (symbols.length === 1 && lower.includes("compare"))) {
            return "stock_comparison";
        }
    }

    if (lower.includes("why buy") || lower.includes("should i buy") || lower.includes("is it good") || lower.includes("is this good") || lower.includes("best stock") || lower.includes("invest or not") || lower.includes("konala") || lower.includes("tiskovala")) {
        return "why_buy_or_risk";
    }

    if (lower.includes("risk") || lower.includes("drawback") || lower.includes("danger") || lower.includes("nasti")) {
        return "risk_explanation";
    }

    if (lower.includes("why is the prediction") || lower.includes("why prediction") || lower.includes("prediction enduku") || lower.includes("enduku up") || lower.includes("enduku down") || lower.includes("confidence mean") || lower.includes("why up") || lower.includes("why down")) {
        return "prediction_explanation";
    }

    if (lower.includes("rsi") || lower.includes("relative strength")) return "indicator_rsi";
    if (lower.includes("macd")) return "indicator_macd";
    if (lower.includes("sma") || lower.includes("simple moving")) return "indicator_sma";
    if (lower.includes("ema") || lower.includes("exponential moving")) return "indicator_ema";
    if (lower.includes("bollinger")) return "indicator_bollinger";
    if (lower.includes("volatility")) return "indicator_volatility";
    if (lower.includes("how does stocksense") || lower.includes("how do you predict") || lower.includes("how prediction")) return "model_how_it_works";

    if (lower.includes("portfolio") || lower.includes("p&l") || lower.includes("holding") || lower.includes("transaction")) {
        return "portfolio_question";
    }

    if (lower.includes("watchlist")) {
        return "watchlist_question";
    }

    if (symbols.length === 1 || lower.includes("analyze") || lower.includes("what is happening") || lower.includes("tell me about") || lower.includes("gurinchi") || lower.includes("details")) {
        return "stock_analysis";
    }

    if (lower.includes("hello") || lower.includes("hi") || lower.includes("namaste") || lower.includes("hey") || lower.includes("help") || lower.includes("who are you")) {
        return "greeting";
    }

    return "general_finance";
};

/**
 * Fetch complete DB context for a stock
 */
const fetchStockContext = async (symbol) => {
    const [stocks] = await db.query(
        "SELECT id, symbol, company_name, exchange, sector, industry, market_cap_category, currency FROM stocks WHERE symbol = ? AND is_active = TRUE LIMIT 1",
        [symbol]
    );

    if (stocks.length === 0) return null;
    const stock = stocks[0];

    // Quote
    let quote = null;
    try {
        quote = await marketDataService.getQuote(stock.symbol);
    } catch (e) {}

    // Indicators
    const [indicators] = await db.query(
        `SELECT sma_20, sma_50, sma_200, ema_20, ema_50, rsi, macd, macd_signal, macd_histogram, bollinger_upper, bollinger_middle, bollinger_lower, volatility, trading_date
         FROM technical_indicators WHERE stock_id = ? ORDER BY trading_date DESC LIMIT 1`,
        [stock.id]
    );

    // AI Prediction
    let prediction = null;
    try {
        const aiRes = await axios.post(`${AI_SERVICE_URL}/predict`, { stock_id: stock.id }, { timeout: 6000 });
        if (aiRes.data && aiRes.data.success) {
            prediction = aiRes.data.prediction;
        }
    } catch (e) {
        const [dbPred] = await db.query(
            "SELECT direction as prediction, confidence_score as confidence, probability FROM predictions WHERE stock_id = ? ORDER BY prediction_date DESC, id DESC LIMIT 1",
            [stock.id]
        );
        if (dbPred.length > 0) {
            prediction = {
                ...dbPred[0],
                confidence: `${dbPred[0].confidence}%`
            };
        }
    }

    // Performance
    const [prices] = await db.query(
        "SELECT trading_date, close_price FROM stock_prices WHERE stock_id = ? ORDER BY trading_date DESC LIMIT 30",
        [stock.id]
    );

    let oneWeek = null;
    let oneMonth = null;
    if (prices.length > 5) {
        const cur = Number(prices[0].close_price);
        const p7 = Number(prices[5].close_price);
        oneWeek = Number((((cur - p7) / p7) * 100).toFixed(2));
    }
    if (prices.length > 20) {
        const cur = Number(prices[0].close_price);
        const p30 = Number(prices[Math.min(21, prices.length - 1)].close_price);
        oneMonth = Number((((cur - p30) / p30) * 100).toFixed(2));
    }

    return {
        stock,
        quote,
        indicators: indicators.length > 0 ? indicators[0] : null,
        prediction,
        performance: { oneWeek, oneMonth }
    };
};

/**
 * Generate Intelligent Conversational Response
 */
const generateResponse = async (userMessage, explicitSymbol = null, conversationHistory = []) => {
    const query = userMessage.trim();
    const isTelugu = detectLanguage(query) === "telugu";

    // 1. Resolve Symbols (including conversation context memory for follow-up "Why?" or "What about X?")
    let symbols = await extractStockSymbols(query, explicitSymbol);

    // If no symbols found in current message, inspect recent conversation history for memory
    let memorySymbol = null;
    if (symbols.length === 0 && conversationHistory && conversationHistory.length > 0) {
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const prev = conversationHistory[i];
            if (prev.symbol) {
                memorySymbol = prev.symbol;
                symbols.push(memorySymbol);
                break;
            }
        }
    }

    const intent = detectIntent(query, symbols);
    const disclaimer = isTelugu
        ? "StockSense విద్యాపరమైన మార్కెట్ విశ్లేషణను మరియు AI అంచనాలను మాత్రమే అందిస్తుంది. ఇవి ఖచ్చితమైన ఆర్థిక సలహా కావు."
        : "StockSense provides educational market analysis and AI-generated predictions. Predictions are probabilistic model outputs and should not be considered guaranteed financial advice.";

    // ============================================================
    // INTENT: STOCK COMPARISON
    // ============================================================
    if (intent === "stock_comparison" && symbols.length >= 2) {
        const [sym1, sym2] = symbols;
        const ctx1 = await fetchStockContext(sym1);
        const ctx2 = await fetchStockContext(sym2);

        if (!ctx1 || !ctx2) {
            return {
                reply: isTelugu
                    ? `పోల్చడానికి అవసరమైన స్టాక్ డేటా అందుబాటులో లేదు.`
                    : `Could not retrieve complete market data for comparison between ${sym1} and ${sym2}.`,
                hasStockContext: false,
                disclaimer
            };
        }

        const p1 = ctx1.quote ? `₹${Number(ctx1.quote.price).toFixed(2)}` : "N/A";
        const p2 = ctx2.quote ? `₹${Number(ctx2.quote.price).toFixed(2)}` : "N/A";
        const rsi1 = ctx1.indicators && ctx1.indicators.rsi ? Number(ctx1.indicators.rsi).toFixed(2) : "N/A";
        const rsi2 = ctx2.indicators && ctx2.indicators.rsi ? Number(ctx2.indicators.rsi).toFixed(2) : "N/A";
        const pred1 = ctx1.prediction ? `${ctx1.prediction.prediction} (${ctx1.prediction.confidence})` : "N/A";
        const pred2 = ctx2.prediction ? `${ctx2.prediction.prediction} (${ctx2.prediction.confidence})` : "N/A";
        const perf1 = ctx1.performance.oneMonth !== null ? `${ctx1.performance.oneMonth >= 0 ? "+" : ""}${ctx1.performance.oneMonth}%` : "N/A";
        const perf2 = ctx2.performance.oneMonth !== null ? `${ctx2.performance.oneMonth >= 0 ? "+" : ""}${ctx2.performance.oneMonth}%` : "N/A";

        let replyText = "";
        if (isTelugu) {
            replyText = `### 📊 ${ctx1.stock.company_name} vs ${ctx2.stock.company_name} పోలిక\n\n` +
                `| మెట్రిక్ | ${ctx1.stock.symbol} | ${ctx2.stock.symbol} |\n` +
                `|---|---|---|\n` +
                `| **ప్రస్తుత ధర** | ${p1} | ${p2} |\n` +
                `| **సెక్టార్** | ${ctx1.stock.sector} | ${ctx2.stock.sector} |\n` +
                `| **1 నెల రిటర్న్** | ${perf1} | ${perf2} |\n` +
                `| **RSI (14)** | ${rsi1} | ${rsi2} |\n` +
                `| **AI మోడల్ ప్రిడిక్షన్** | **${pred1}** | **${pred2}** |\n\n` +
                `**సారాంశం:**\n` +
                `* **మొమెంటమ్:** ${Number(rsi1) > Number(rsi2) ? `${ctx1.stock.company_name} లో అధిక RSI మొమెంటమ్ కనిపిస్తోంది` : `${ctx2.stock.company_name} లో అధిక RSI మొమెంటమ్ కనిపిస్తోంది`}.\n` +
                `* **AI మోడల్ సిగ్నల్:** ${sym1} కి ${pred1} మరియు ${sym2} కి ${pred2} నమోదు చేయబడింది.`;
        } else {
            replyText = `### 📊 Comparative Analysis: **${ctx1.stock.company_name}** vs **${ctx2.stock.company_name}**\n\n` +
                `| Feature / Metric | ${ctx1.stock.symbol} | ${ctx2.stock.symbol} |\n` +
                `|---|---|---|\n` +
                `| **Current Price** | ${p1} | ${p2} |\n` +
                `| **Sector & Cap** | ${ctx1.stock.sector} (${ctx1.stock.market_cap_category}) | ${ctx2.stock.sector} (${ctx2.stock.market_cap_category}) |\n` +
                `| **1-Month Trend** | ${perf1} | ${perf2} |\n` +
                `| **RSI (14)** | ${rsi1} | ${rsi2} |\n` +
                `| **AI Directional Forecast** | **${pred1}** | **${pred2}** |\n\n` +
                `**Key Comparative Observations:**\n` +
                `* **Relative Momentum:** ${Number(rsi1) > Number(rsi2) ? `${ctx1.stock.symbol} shows higher relative momentum (RSI ${rsi1}) than ${ctx2.stock.symbol} (RSI ${rsi2})` : `${ctx2.stock.symbol} shows higher relative momentum (RSI ${rsi2}) than ${ctx1.stock.symbol} (RSI ${rsi1})`}.\n` +
                `* **AI Model Outlook:** ${ctx1.stock.symbol} is forecasted **${pred1}** while ${ctx2.stock.symbol} is forecasted **${pred2}**.\n` +
                `* **Risk Note:** Compare their volatility and moving average positions before making simulated virtual trades.`;
        }

        return {
            reply: replyText,
            symbols: [sym1, sym2],
            hasStockContext: true,
            suggestedPrompts: [
                `Why is ${sym1} predicted ${ctx1.prediction ? ctx1.prediction.prediction : 'UP'}?`,
                `What are the risks with ${sym2}?`,
                `Explain RSI difference`
            ],
            disclaimer
        };
    }

    // ============================================================
    // INTENT: SINGLE STOCK ANALYSIS / WHY BUY / RISK / PREDICTION
    // ============================================================
    if (symbols.length === 1 || (memorySymbol && (intent === "prediction_explanation" || intent === "why_buy_or_risk" || intent === "risk_explanation"))) {
        const targetSymbol = symbols[0] || memorySymbol;
        const ctx = await fetchStockContext(targetSymbol);

        if (ctx) {
            const { stock, quote, indicators, prediction, performance } = ctx;
            const price = quote ? `₹${Number(quote.price).toFixed(2)}` : "N/A";
            const changeStr = quote ? `${quote.change >= 0 ? "+" : ""}${Number(quote.change).toFixed(2)} (${quote.changePercent})` : "N/A";
            const rsiVal = indicators && indicators.rsi ? Number(indicators.rsi).toFixed(2) : null;
            const rsiStatus = rsiVal ? (rsiVal >= 70 ? "Overbought" : rsiVal <= 30 ? "Oversold" : "Neutral") : "N/A";
            const sma20 = indicators && indicators.sma_20 ? `₹${Number(indicators.sma_20).toFixed(2)}` : "N/A";
            const sma50 = indicators && indicators.sma_50 ? `₹${Number(indicators.sma_50).toFixed(2)}` : "N/A";
            const macdVal = indicators && indicators.macd ? Number(indicators.macd).toFixed(2) : "N/A";
            const predDir = prediction ? prediction.prediction : "UNAVAILABLE";
            const predConf = prediction ? prediction.confidence : "N/A";

            let replyText = "";

            if (isTelugu) {
                // Telugu Response
                if (intent === "why_buy_or_risk" || intent === "risk_explanation") {
                    replyText = `### 🛡️ **${stock.company_name} (${stock.symbol})** — రిస్క్ మరియు విశ్లేషణ అంశాలు\n\n` +
                        `ఈ స్టాక్‌ను విశ్లేషించేటప్పుడు ఈ కింది అంశాలను గమనించాలి:\n\n` +
                        `* **ధర కదలిక:** ప్రస్తుతం ₹${quote ? quote.price : 'N/A'} వద్ద ట్రేడవుతోంది (${changeStr}).\n` +
                        `* **RSI సూచిక:** ${rsiVal || 'N/A'} (${rsiStatus}). ఇది ప్రస్తుతం మొమెంటమ్ స్థితిని సూచిస్తుంది.\n` +
                        `* **మూవింగ్ యావరేజ్:** 20-రోజుల సగటు ${sma20}, 50-రోజుల సగటు ${sma50}.\n` +
                        `* **AI మోడల్ సిగ్నల్:** **${predDir}** (కాన్ఫిడెన్స్: ${predConf}).\n\n` +
                        `**ప్రధాన రిస్కులు:**\n` +
                        `1. మార్కెట్ ఒడిదుడుకులు మరియు సెక్టార్ ట్రెండ్స్.\n` +
                        `2. AI అంచనాలు హిస్టారికల్ డేటా ఆధారిత సంభావ్యతలు మాత్రమే, గ్యారెంటీ లాభాలు కావు.`;
                } else if (intent === "prediction_explanation") {
                    replyText = `### 🤖 **${stock.company_name} (${stock.symbol})** AI ప్రిడిక్షన్ వివరణ\n\n` +
                        `* **ప్రిడిక్షన్:** **${predDir}**\n` +
                        `* **కాన్ఫిడెన్స్ స్కోరు:** ${predConf}\n\n` +
                        `**మోడల్ ఈ అంచనాను ఎందుకు ఇచ్చింది?**\n` +
                        `StockSense Random Forest మోడల్ 13 సాంకేతిక సూచికలను (RSI: ${rsiVal}, MACD: ${macdVal}, మూవింగ్ యావరేజెస్) పరిశీలించి, తాజా ట్రెండ్ మొమెంటమ్ ఆధారంగా ఈ సంభావ్యతను లెక్కించింది.`;
                } else {
                    replyText = `### 📈 **${stock.company_name} (${stock.symbol})** సమగ్ర సమాచారం\n\n` +
                        `* **ధర:** ${price} (${changeStr})\n` +
                        `* **సెక్టార్:** ${stock.sector} | **మార్కెట్ క్యాప్:** ${stock.market_cap_category}\n` +
                        `* **RSI (14):** ${rsiVal || 'N/A'} (${rsiStatus})\n` +
                        `* **మూవింగ్ యావరేజ్ (SMA 20):** ${sma20}\n` +
                        `* **AI ప్రిడిక్షన్:** **${predDir}** (విశ్వసనీయత: ${predConf})\n\n` +
                        `**గమనిక:** తాజా డేటా ప్రకారం స్టాక్ సాంకేతిక సూచికలు పరిశీలించబడ్డాయి.`;
                }
            } else {
                // English Response
                if (intent === "why_buy_or_risk") {
                    replyText = `### 💡 Evaluation & Factors for **${stock.company_name} (${stock.symbol})**\n\n` +
                        `While StockSense does not provide financial advice, here are the objective data points to evaluate:\n\n` +
                        `* **Current Trend & Price:** Trading at **${price}** (${changeStr}) in the **${stock.sector}** sector (${stock.market_cap_category}).\n` +
                        `* **Technical Momentum:** RSI is **${rsiVal || 'N/A'}** (${rsiStatus}). Price is ${quote && indicators && indicators.sma_20 && quote.price >= indicators.sma_20 ? 'trading above' : 'trading near/below'} its 20-day average (${sma20}).\n` +
                        `* **AI Machine Learning Outlook:** The Random Forest model forecasts **${predDir}** with a confidence score of **${predConf}**.\n\n` +
                        `**Key Risks to Consider:**\n` +
                        `1. Sector headwinds and broader market volatility.\n` +
                        `2. Technical resistance near recent highs.\n` +
                        `3. AI model predictions are probabilistic estimates based on historical indicators and do not guarantee future returns.`;
                } else if (intent === "prediction_explanation") {
                    replyText = `### 🤖 Prediction Rationale for **${stock.company_name} (${stock.symbol})**\n\n` +
                        `* **Forecast Direction:** **${predDir}**\n` +
                        `* **Model Confidence Score:** **${predConf}**\n` +
                        `* **Model Architecture:** Supervised Random Forest Classifier\n\n` +
                        `**Why the model generated this output:**\n` +
                        `1. **Momentum Features:** RSI is at **${rsiVal || 'N/A'}** (${rsiStatus}) and MACD Histogram is at **${indicators ? Number(indicators.macd_histogram).toFixed(2) : 'N/A'}**.\n` +
                        `2. **Moving Averages:** Price relationship to SMA 20 (**${sma20}**) and SMA 50 (**${sma50}**).\n` +
                        `3. **Historical Pattern Matching:** The ensemble of decision trees identified statistical similarity between current technical indicator levels and historical positive momentum setups.`;
                } else if (intent === "risk_explanation") {
                    replyText = `### ⚠️ Risk Factors for **${stock.company_name} (${stock.symbol})**\n\n` +
                        `* **Volatility:** Calculated rolling volatility is **${indicators && indicators.volatility ? (Number(indicators.volatility) * 100).toFixed(2) + '%' : 'N/A'}**.\n` +
                        `* **Overbought/Oversold Condition:** RSI is **${rsiVal || 'N/A'}** (${rsiStatus}).\n` +
                        `* **Trend Support:** 20-day SMA is at **${sma20}** and 50-day SMA is at **${sma50}**.\n` +
                        `* **Market Risk:** Equities are subject to market conditions, quarterly earnings fluctuations, and macroeconomic shifts.`;
                } else {
                    // General Stock Overview
                    replyText = `### Analysis & Overview for **${stock.company_name} (${stock.symbol})**\n\n` +
                        `* **Current Price:** ${price} (${changeStr})\n` +
                        `* **Sector & Category:** ${stock.sector} | ${stock.market_cap_category}\n` +
                        `* **Day Range:** Low ₹${quote ? Number(quote.low).toFixed(2) : 'N/A'} — High ₹${quote ? Number(quote.high).toFixed(2) : 'N/A'}\n\n` +
                        `#### 📊 Technical Indicators:\n` +
                        `* **RSI (14):** ${rsiVal || 'N/A'} (${rsiStatus})\n` +
                        `* **SMA 20:** ${sma20} | **SMA 50:** ${sma50}\n` +
                        `* **MACD:** ${macdVal} (Signal: ${indicators && indicators.macd_signal ? Number(indicators.macd_signal).toFixed(2) : 'N/A'})\n` +
                        `* **Bollinger Bands:** ₹${indicators && indicators.bollinger_lower ? Number(indicators.bollinger_lower).toFixed(2) : 'N/A'} to ₹${indicators && indicators.bollinger_upper ? Number(indicators.bollinger_upper).toFixed(2) : 'N/A'}\n\n` +
                        `#### 🤖 AI Model Prediction:\n` +
                        `* **Direction:** **${predDir}** (Confidence: **${predConf}**)\n` +
                        `* **Interpretation:** The Random Forest classifier indicates a **${predDir === 'UP' ? 'bullish' : 'bearish'}** outlook based on recent momentum indicators.`;
                }
            }

            return {
                reply: replyText,
                symbol: stock.symbol,
                hasStockContext: true,
                suggestedPrompts: [
                    `Why is the prediction ${predDir}?`,
                    `What are the risks with ${stock.symbol}?`,
                    `Compare ${stock.symbol} with another stock`,
                    `Explain RSI (${rsiVal || '14'})`
                ],
                disclaimer
            };
        }
    }

    // ============================================================
    // INTENT: TECHNICAL INDICATOR EDUCATIONAL QUESTIONS
    // ============================================================
    if (intent.startsWith("indicator_")) {
        const indKey = intent.replace("indicator_", "");
        const info = EDUCATIONAL_KNOWLEDGE[indKey];
        if (info) {
            if (isTelugu) {
                const teluguExplanations = {
                    rsi: "### Relative Strength Index (RSI)\n\nRSI అనేది స్టాక్ యొక్క మొమెంటమ్ (వేగం మరియు మార్పు) కొలిచే 0–100 స్కేల్ సూచిక. **RSI > 70** ఉంటే స్టాక్ ఓవర్‌బాట్ (అధికంగా కొనుగోలు చేయబడింది, తగ్గవచ్చు) అని, **RSI < 30** ఉంటే ఓవర్‌సోల్డ్ (తక్కువ ధరకు పడిపోయింది, పెరగవచ్చు) అని భావిస్తారు.",
                    macd: "### Moving Average Convergence Divergence (MACD)\n\nMACD అనేది ట్రెండ్ మరియు మొమెంటమ్‌ను తెలియజేసే ముఖ్యమైన సూచిక. MACD లైన్ సిగ్నల్ లైన్‌ను పైకి క్రాస్ చేసినప్పుడు అది **బుల్లిష్ (లాభదాయక)** సంకేతం.",
                    sma: "### Simple Moving Average (SMA)\n\nSMA అనేది ఒక నిర్దిష్ట కాల వ్యవధిలోని (ఉదాహరణకు 20 లేదా 50 రోజులు) సగటు ధరను లెక్కిస్తుంది. ధర SMA కంటే పైన ఉంటే అప్‌ట్రెండ్ అని సూచిస్తుంది.",
                    ema: "### Exponential Moving Average (EMA)\n\nEMA ఇటీవలి ధరల కదలికలకు ఎక్కువ ప్రాధాన్యత ఇస్తుంది, కాబట్టి ఇది మార్కెట్ మార్పులకు SMA కంటే వేగంగా స్పందిస్తుంది.",
                    bollinger: "### Bollinger Bands\n\nబోలింగర్ బ్యాండ్స్ ధరల ఒడిదుడుకులను (వోలటాలిటీ) చూపిస్తాయి. బ్యాండ్స్ ఇరుకైనప్పుడు భవిష్యత్తులో పెద్ద ధర మార్పు రావచ్చని సూచిస్తుంది."
                };
                return {
                    reply: teluguExplanations[indKey] || `### ${info.title}\n\n${info.explanation}`,
                    hasStockContext: false,
                    suggestedPrompts: ["Explain MACD", "Analyze TCS", "How AI predicts?"],
                    disclaimer
                };
            }

            return {
                reply: `### ${info.title}\n\n${info.explanation}`,
                hasStockContext: false,
                suggestedPrompts: [
                    "What is the difference between SMA and EMA?",
                    "How does StockSense calculate predictions?",
                    "Analyze TCS.BSE"
                ],
                disclaimer
            };
        }
    }

    // ============================================================
    // INTENT: PORTFOLIO & WATCHLIST QUESTIONS
    // ============================================================
    if (intent === "portfolio_question") {
        return {
            reply: isTelugu
                ? `### వర్చువల్ పోర్ట్‌ఫోలియో నిర్వహణ\n\nStockSense వర్చువల్ పోర్ట్‌ఫోలియో ద్వారా మీరు నిజమైన డబ్బు లేకుండా స్టాక్ ట్రేడింగ్‌ను అనుకరించవచ్చు మరియు లాభ/నష్టాలను (P&L) ట్రాక్ చేయవచ్చు.\n\n* **మొత్తం పెట్టుబడి:** కొనుగోలు చేసిన షేర్ల మొత్తం విలువ.\n* **ప్రస్తుత విలువ:** తాజా మార్కెట్ ధర ప్రకారం హోల్డింగ్స్ విలువ.\n* **రిటర్న్స్ (%):** పెట్టుబడిపై వచ్చిన లాభ లేదా నష్ట శాతం.`
                : `### Virtual Portfolio Management in StockSense\n\nThe **Virtual Portfolio** allows you to simulate real-world equity investing without risking real capital:\n\n* **Total Invested:** Cumulative cost of all simulated BUY orders.\n* **Current Value:** Valuation of holdings based on live MySQL market prices.\n* **Unrealized P&L:** Net profit or loss and percentage returns.\n\nNavigate to **Portfolio** to record simulated trades and track performance in real time.`,
            hasStockContext: false,
            suggestedPrompts: ["How to add stocks to watchlist?", "Analyze INFY.BSE", "What is RSI?"],
            disclaimer
        };
    }

    if (intent === "watchlist_question") {
        return {
            reply: isTelugu
                ? `### వాచ్‌లిస్ట్ ఫీచర్\n\nమీరు ఇష్టపడే స్టాక్‌లను వాచ్‌లిస్ట్‌లో భద్రపరచుకోవచ్చు. దీని ద్వారా తాజా ధరలు మరియు AI ప్రిడిక్షన్లను ఒకే చోట సులభంగా పర్యవేక్షించవచ్చు.`
                : `### Watchlist Feature in StockSense\n\nThe **Watchlist** allows you to monitor your favorite equities, view real-time market changes, and track AI directional badges without executing trades. Click **★ Add to Watchlist** on any stock page to save it.`,
            hasStockContext: false,
            suggestedPrompts: ["Analyze RELIANCE.BSE", "Compare TCS and INFY", "Top gainers"],
            disclaimer
        };
    }

    // ============================================================
    // INTENT: GREETING & GENERAL
    // ============================================================
    if (intent === "greeting") {
        return {
            reply: isTelugu
                ? `నమస్తే! నేను మీ **StockSense AI అసిస్టెంట్** ని.\n\nమీరు నన్ను వీటి గురించి అడగవచ్చు:\n* **స్టాక్ విశ్లేషణ:** *"TCS విశ్లేషణ చేయి"*, *"Reliance పరిస్థితి ఏంటి?"*\n* **స్టాక్ పోలిక:** *"Compare TCS and INFY"*\n* **సాంకేతిక సూచికలు:** *"RSI అంటే ఏమిటి?"*, *"MACD ఎలా పనిచేస్తుంది?"*\n* **ప్రిడిక్షన్లు:** *"ఈ స్టాక్ ప్రిడిక్షన్ ఎందుకు UP వచ్చింది?"*\n\nనేను మీకు ఎలా సహాయపడగలను?`
                : `Hello! I am your **StockSense AI Market Assistant**.\n\nYou can ask me natural questions such as:\n* **Stock Analysis:** *"What is happening with TCS?"*, *"Analyze Reliance"*, *"Tell me about HDFC Bank"*\n* **Comparisons:** *"Compare TCS and INFY"*, *"Compare Reliance and ONGC"*\n* **Technical Explanations:** *"What is RSI?"*, *"Explain MACD"*, *"Difference between SMA and EMA"*\n* **AI Insights:** *"Why is the prediction UP?"*, *"What are the risks with this stock?"*\n* **Telugu Support:** *"RSI ante enti?"*, *"TCS gurinchi cheppu"*\n\nHow can I help with your market analysis today?`,
            hasStockContext: false,
            suggestedPrompts: [
                "Analyze TCS.BSE",
                "Compare TCS and INFY",
                "What is RSI?",
                "Why is the prediction UP?"
            ],
            disclaimer
        };
    }

    // Default Conversational Answer
    return {
        reply: isTelugu
            ? `మీరు అడిగిన ప్రశ్న: *"${query}"*\n\nస్టాక్‌సెన్స్ ప్లాట్‌ఫారమ్‌లో భారతీయ మార్కెట్ స్టాక్‌ల విశ్లేషణ, 13 సాంకేతిక సూచికలు మరియు AI ప్రిడిక్షన్లు అందుబాటులో ఉన్నాయి. ఉదాహరణకు: *"Analyze TCS"*, *"Compare TCS and INFY"*, లేదా *"RSI అంటే ఏమిటి?"* అని అడగండి.`
            : `You asked: *"${query}"*\n\nStockSense tracks 70+ Indian equities with 13 verified technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, Volatility) and Random Forest AI predictions.\n\nTry asking:\n* *"What is happening with TCS?"*\n* *"Compare TCS and INFY"*\n* *"Why is Reliance predicted UP?"*\n* *"Explain RSI (14)"*`,
        hasStockContext: false,
        suggestedPrompts: [
            "Analyze TCS.BSE",
            "Compare TCS and INFY",
            "What is RSI?",
            "How does AI prediction work?"
        ],
        disclaimer
    };
};

module.exports = {
    generateResponse,
    extractStockSymbols,
    detectLanguage,
    detectIntent
};

// ============================================================
// StockSense — Stock Details Logic
// ============================================================

let historyChart = null;
let currentStockData = null;
let isInWatchlist = false;

// Extract symbol from URL
const params = new URLSearchParams(window.location.search);
const symbol = params.get("symbol");

const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const stockContent = document.getElementById("stockContent");
const btnWatchlistToggle = document.getElementById("btnWatchlistToggle");

function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || value === "") return "N/A";
    const number = Number(value);
    return Number.isNaN(number) ? "N/A" : number.toFixed(decimals);
}

function formatPerformance(value) {
    if (!value) return "Not enough data";
    const changePercent = Number(value.changePercent);
    if (Number.isNaN(changePercent)) return "N/A";
    const sign = changePercent >= 0 ? "+" : "";
    return `${sign}${changePercent.toFixed(2)}%`;
}

// ------------------------------------------------------------
// Load Complete Stock Details & Analysis
// ------------------------------------------------------------

async function loadStockAnalysis() {
    if (!symbol) {
        showError("Stock symbol is missing from URL. <br><a href='dashboard.html'>Back to Dashboard</a>");
        return;
    }

    try {
        loading.style.display = "block";
        errorMessage.innerHTML = "";
        stockContent.style.display = "none";

        const data = await getStockAnalysis(symbol);
        currentStockData = data;

        if (!data.success) {
            throw new Error(data.message || "Unable to load stock analysis");
        }

        // Render sections
        displayStockHeader(data);
        displayMarketInfo(data.market);
        displayCompanyInfo(data.stock);
        displayPerformance(data.performance);
        displayIndicators(data.technicalIndicators);
        displayAiPrediction(data.aiAnalysis, data.technicalIndicators, data.market);
        generateRecommendation(data.aiAnalysis, data.technicalIndicators, data.market);

        // Check watchlist status if user is logged in
        checkUserWatchlistStatus();

        // Load news
        loadStockNewsData();

        loading.style.display = "none";
        stockContent.style.display = "block";

        // Load 1M chart by default
        await loadHistory("1M");

    } catch (error) {
        console.error("Stock analysis error:", error);
        loading.style.display = "none";
        showError(`Unable to load stock information.<br>${error.message}<br><br><a href="dashboard.html" class="btn btn-primary">Return to Dashboard</a>`);
    }
}

// ------------------------------------------------------------
// Section Renderers
// ------------------------------------------------------------

function displayStockHeader(data) {
    const stock = data.stock;
    const market = data.market || {};

    document.getElementById("companyName").textContent = stock.companyName || symbol;
    document.getElementById("stockSymbol").textContent = stock.symbol;

    if (market.price !== undefined && market.price !== null) {
        document.getElementById("currentPrice").textContent = `₹${formatNumber(market.price)}`;

        const changeEl = document.getElementById("change");
        const change = Number(market.change || 0);
        const changePercent = market.changePercent || "0.00%";
        const isPositive = change >= 0;

        changeEl.textContent = `${isPositive ? '+' : ''}${formatNumber(change)} (${changePercent})`;
        changeEl.className = isPositive ? "text-positive" : "text-negative";
    }
}

function displayMarketInfo(market) {
    if (!market) return;
    document.getElementById("openPrice").textContent = market.open ? `₹${formatNumber(market.open)}` : "N/A";
    document.getElementById("highPrice").textContent = market.high ? `₹${formatNumber(market.high)}` : "N/A";
    document.getElementById("lowPrice").textContent = market.low ? `₹${formatNumber(market.low)}` : "N/A";
    document.getElementById("previousClose").textContent = market.previousClose ? `₹${formatNumber(market.previousClose)}` : "N/A";
    document.getElementById("volume").textContent = market.volume ? Number(market.volume).toLocaleString("en-IN") : "N/A";
    document.getElementById("tradingDay").textContent = market.latestTradingDay || "N/A";
}

function displayCompanyInfo(stock) {
    if (!stock) return;
    document.getElementById("exchange").textContent = stock.exchange || "N/A";
    document.getElementById("country").textContent = stock.country || "N/A";
    document.getElementById("sector").textContent = stock.sector || "N/A";
    document.getElementById("industry").textContent = stock.industry || "N/A";
    document.getElementById("currency").textContent = stock.currency || "INR";
}

function displayPerformance(performance) {
    if (!performance) return;

    const periods = ["oneWeek", "oneMonth", "threeMonths", "sixMonths", "oneYear"];
    periods.forEach(p => {
        const el = document.getElementById(`${p}Performance`);
        if (el && performance[p]) {
            const val = performance[p];
            el.textContent = formatPerformance(val);
            el.className = Number(val.changePercent) >= 0 ? "text-positive" : "text-negative";
        }
    });
}

function displayIndicators(ind) {
    if (!ind) return;
    document.getElementById("sma20").textContent = ind.sma20 ? `₹${formatNumber(ind.sma20)}` : "N/A";
    document.getElementById("sma50").textContent = ind.sma50 ? `₹${formatNumber(ind.sma50)}` : "N/A";
    document.getElementById("ema20").textContent = ind.ema20 ? `₹${formatNumber(ind.ema20)}` : "N/A";
    document.getElementById("ema50").textContent = ind.ema50 ? `₹${formatNumber(ind.ema50)}` : "N/A";
    document.getElementById("rsi").textContent = ind.rsi ? formatNumber(ind.rsi) : "N/A";
    document.getElementById("macd").textContent = ind.macd ? formatNumber(ind.macd, 4) : "N/A";
    document.getElementById("macdSignal").textContent = ind.macdSignal ? formatNumber(ind.macdSignal, 4) : "N/A";
    document.getElementById("macdHistogram").textContent = ind.macdHistogram ? formatNumber(ind.macdHistogram, 4) : "N/A";
    document.getElementById("bollingerUpper").textContent = ind.bollingerUpper ? `₹${formatNumber(ind.bollingerUpper)}` : "N/A";
    document.getElementById("bollingerMiddle").textContent = ind.bollingerMiddle ? `₹${formatNumber(ind.bollingerMiddle)}` : "N/A";
    document.getElementById("bollingerLower").textContent = ind.bollingerLower ? `₹${formatNumber(ind.bollingerLower)}` : "N/A";
    document.getElementById("volatility").textContent = ind.volatility !== null && ind.volatility !== undefined
        ? `${formatNumber(ind.volatility * 100)}%`
        : "N/A";
}

function displayAiPrediction(ai, indicators, market) {
    if (!ai) return;

    const dir = ai.prediction || "NEUTRAL";
    const predEl = document.getElementById("prediction");
    predEl.textContent = dir;
    predEl.className = dir === "UP" ? "text-positive" : dir === "DOWN" ? "text-negative" : "text-neutral";

    document.getElementById("confidence").textContent = ai.confidence || "N/A";
    document.getElementById("probability").textContent = ai.probability !== undefined && ai.probability !== null
        ? `${(Number(ai.probability) * 100).toFixed(2)}%`
        : "N/A";

    const aiPrice = ai.currentPrice || (market ? market.price : null);
    document.getElementById("aiCurrentPrice").textContent = aiPrice ? `₹${formatNumber(aiPrice)}` : "N/A";

    const signal = dir === "UP" ? "Bullish Signal" : dir === "DOWN" ? "Bearish Signal" : "Neutral Signal";
    const sigEl = document.getElementById("aiSignal");
    sigEl.textContent = signal;
    sigEl.className = dir === "UP" ? "text-positive" : dir === "DOWN" ? "text-negative" : "text-neutral";

    // Summary text
    const probPct = ai.probability ? (Number(ai.probability) * 100).toFixed(2) : "50.00";
    document.getElementById("aiSummary").textContent =
        `The Random Forest classification model indicates a ${signal.toLowerCase()} with an estimated confidence score of ${ai.confidence || probPct + '%'}.`;

    // Reasons breakdown
    const reasons = [];
    if (indicators) {
        if (indicators.rsi) {
            const r = Number(indicators.rsi);
            reasons.push(r >= 70 ? `RSI is ${r.toFixed(2)} (Overbought condition — watch for resistance).` : r <= 30 ? `RSI is ${r.toFixed(2)} (Oversold condition — potential price support).` : `RSI is ${r.toFixed(2)} (Neutral momentum zone).`);
        }
        if (indicators.macd && indicators.macdSignal) {
            reasons.push(Number(indicators.macd) > Number(indicators.macdSignal)
                ? "MACD line is above the Signal line, indicating upward momentum."
                : "MACD line is below the Signal line, indicating downward momentum.");
        }
        if (indicators.sma20 && market && market.price) {
            reasons.push(Number(market.price) > Number(indicators.sma20)
                ? "Current price trades above the 20-day SMA, supporting short-term uptrend."
                : "Current price trades below the 20-day SMA, indicating short-term weakness.");
        }
    }

    const aiReasonsEl = document.getElementById("aiReasons");
    if (reasons.length > 0) {
        aiReasonsEl.innerHTML = reasons.map(r => `<li>${r}</li>`).join("");
    } else {
        aiReasonsEl.innerHTML = "<li>Technical indicators are within standard neutral variance.</li>";
    }
}

function generateRecommendation(ai, indicators, market) {
    const recEl = document.getElementById("recommendation");
    const reasonEl = document.getElementById("recommendationReason");
    if (!recEl || !reasonEl) return;

    let score = 0;
    const reasons = [];

    if (ai && ai.prediction === "UP") {
        score += 2;
        reasons.push(`AI model indicates upward movement (${ai.confidence || ''}).`);
    } else if (ai && ai.prediction === "DOWN") {
        score -= 2;
        reasons.push(`AI model indicates downward movement (${ai.confidence || ''}).`);
    }

    if (indicators && indicators.rsi) {
        const rsi = Number(indicators.rsi);
        if (rsi < 35) score += 1;
        else if (rsi > 65) score -= 1;
    }

    if (indicators && indicators.macd && indicators.macdSignal) {
        if (Number(indicators.macd) > Number(indicators.macdSignal)) score += 1;
        else score -= 1;
    }

    let rec = "HOLD";
    let colorClass = "text-neutral";
    let outlook = "Neutral consolidation";

    if (score >= 2) {
        rec = "BUY / BULLISH BIAS";
        colorClass = "text-positive";
        outlook = "Favorable technical setup with positive momentum alignment.";
    } else if (score <= -2) {
        rec = "SELL / BEARISH BIAS";
        colorClass = "text-negative";
        outlook = "Weak technical momentum indicating caution or potential profit-taking.";
    }

    recEl.textContent = rec;
    recEl.className = colorClass;
    reasonEl.innerHTML = `<strong>${outlook}</strong> ${reasons.join(" ")}`;
}

// ------------------------------------------------------------
// Interactive Historical Price Chart
// ------------------------------------------------------------

async function loadHistory(period = "1M") {
    if (!symbol) return;

    // Update active button state
    document.querySelectorAll(".period-buttons button").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.getElementById(`btn-${period}`);
    if (activeBtn) activeBtn.classList.add("active");

    try {
        const data = await getStockHistory(symbol, period);

        if (!data.success || !data.prices || data.prices.length === 0) {
            console.warn("No price data for period:", period);
            return;
        }

        displayHistoryChart(data.prices, period);

    } catch (err) {
        console.error("History fetch error:", err);
    }
}

function displayHistoryChart(prices, period) {
    const canvas = document.getElementById("historyChart");
    if (!canvas) return;

    const labels = prices.map(p => {
        const d = new Date(p.date);
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    });

    const closePrices = prices.map(p => Number(p.close));

    if (historyChart) {
        historyChart.destroy();
    }

    historyChart = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: `${symbol} Closing Price (₹)`,
                data: closePrices,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.08)",
                borderWidth: 2,
                tension: 0.25,
                fill: true,
                pointRadius: prices.length > 50 ? 0 : 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Price: ₹${Number(ctx.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    beginAtZero: false,
                    grid: { color: "#f1f5f9" },
                    ticks: {
                        callback: (val) => "₹" + Number(val).toLocaleString("en-IN")
                    }
                }
            }
        }
    });
}

// ------------------------------------------------------------
// Watchlist Toggle
// ------------------------------------------------------------

async function checkUserWatchlistStatus() {
    if (!isLoggedIn() || !btnWatchlistToggle) return;

    try {
        const res = await checkWatchlist(symbol);
        isInWatchlist = res.inWatchlist;
        updateWatchlistButtonUI();
    } catch (e) {
        console.warn("Watchlist status check error:", e);
    }
}

function updateWatchlistButtonUI() {
    if (!btnWatchlistToggle) return;

    if (isInWatchlist) {
        btnWatchlistToggle.innerHTML = "★ In Watchlist";
        btnWatchlistToggle.className = "btn btn-primary";
    } else {
        btnWatchlistToggle.innerHTML = "☆ Add to Watchlist";
        btnWatchlistToggle.className = "btn btn-outline";
    }
}

async function toggleStockWatchlist() {
    if (!isLoggedIn()) {
        showToast("Please sign in to save stocks to your Watchlist", "info");
        setTimeout(() => {
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }, 1200);
        return;
    }

    try {
        if (isInWatchlist) {
            const res = await removeFromWatchlist(symbol);
            if (res.success) {
                isInWatchlist = false;
                updateWatchlistButtonUI();
                showToast(`${symbol} removed from Watchlist`, "info");
            }
        } else {
            const res = await addToWatchlist(symbol);
            if (res.success) {
                isInWatchlist = true;
                updateWatchlistButtonUI();
                showToast(`⭐ ${symbol} added to your Watchlist!`, "success");
            }
        }
    } catch (err) {
        showToast(err.message || "Failed to update watchlist", "error");
    }
}

// ------------------------------------------------------------
// Trade Modal
// ------------------------------------------------------------

function openStockTradeModal() {
    if (!isLoggedIn()) {
        showToast("Please sign in to record virtual trades", "info");
        setTimeout(() => {
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }, 1200);
        return;
    }

    document.getElementById("modalStockSymbol").textContent = symbol;
    const price = currentStockData && currentStockData.market ? currentStockData.market.price : 1000;
    document.getElementById("modalTradePrice").value = Number(price).toFixed(2);
    document.getElementById("stockTradeModal").style.display = "flex";
}

function closeStockTradeModal() {
    document.getElementById("stockTradeModal").style.display = "none";
}

// Handle Trade Form Submission
document.addEventListener("DOMContentLoaded", () => {
    const tradeForm = document.getElementById("stockTradeForm");
    if (tradeForm) {
        tradeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const transaction_type = document.getElementById("modalTradeType").value;
            const quantity = Number(document.getElementById("modalTradeQuantity").value);
            const price_per_share = Number(document.getElementById("modalTradePrice").value);
            const submitBtn = document.getElementById("btnModalSubmitTrade");

            try {
                if (submitBtn) submitBtn.disabled = true;
                if (submitBtn) submitBtn.textContent = "Recording...";

                const res = await addPortfolioTransaction({
                    symbol,
                    transaction_type,
                    quantity,
                    price_per_share
                });

                if (res.success) {
                    showToast(`Trade recorded! (${transaction_type} ${quantity} ${symbol})`, "success");
                    closeStockTradeModal();
                }
            } catch (err) {
                showToast(err.message || "Failed to record trade", "error");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (submitBtn) submitBtn.textContent = "Record Transaction";
            }
        });
    }
});

// ------------------------------------------------------------
// AI Assistant Context Redirect
// ------------------------------------------------------------

function askAiAboutCurrentStock() {
    window.location.href = `ai-chat.html?q=${encodeURIComponent(`Analyze ${symbol}`)}`;
}

function openComparePrompt() {
    const secondStock = prompt(`Enter a stock ticker or company name to compare with ${symbol || 'this stock'} (e.g. INFY, TCS, RELIANCE, HDFC, SBIN):`);
    if (secondStock && secondStock.trim()) {
        const cleaned = secondStock.trim().toUpperCase();
        const secondSym = cleaned.endsWith(".BSE") ? cleaned : `${cleaned}.BSE`;
        window.location.href = `ai-chat.html?compare=${encodeURIComponent((symbol || "") + "," + secondSym)}`;
    }
}

// ------------------------------------------------------------
// News Section
// ------------------------------------------------------------

async function loadStockNewsData() {
    const container = document.getElementById("stockNewsContainer");
    if (!container) return;

    try {
        const data = await getStockNews(symbol);
        if (data.success && data.news && data.news.length > 0) {
            container.innerHTML = data.news.map(n => `
                <div class="news-item">
                    <h4>${n.title}</h4>
                    <p>${n.description || ''}</p>
                    <div class="news-meta">
                        ${n.source || 'Financial News'} • ${new Date(n.published_at).toLocaleDateString()}
                    </div>
                </div>
            `).join("");
        } else {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">No recent news available for ${symbol}.</p>`;
        }
    } catch (e) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">No recent news available.</p>`;
    }
}

function showError(msg) {
    if (errorMessage) {
        errorMessage.innerHTML = `<div class="card" style="border-left: 4px solid var(--danger);">${msg}</div>`;
    }
}

// Start
document.addEventListener("DOMContentLoaded", () => {
    loadStockAnalysis();
});
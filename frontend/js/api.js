// ============================================================
// StockSense — Centralized API Service
// ============================================================

const API_BASE_URL = "http://localhost:5000/api";

function getAuthToken() {
    return localStorage.getItem("stocksense_token");
}

function getAuthHeaders() {
    const token = getAuthToken();
    return {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
}

async function handleResponse(response) {
    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = {};
    }

    if (response.status === 401) {
        localStorage.removeItem("stocksense_token");
        localStorage.removeItem("stocksense_user");
        const currentPath = window.location.pathname.split("/").pop() || "";
        if (currentPath !== "login.html" && currentPath !== "register.html") {
            window.location.replace("login.html?session_expired=true");
        }
    }

    if (!response.ok) {
        const error = new Error(data.message || `HTTP Error ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return data;
}

// ------------------------------------------------------------
// 1. AUTHENTICATION APIS
// ------------------------------------------------------------

async function loginUser(email, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
}

async function registerUser(userData) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
    });
    return handleResponse(res);
}

async function getUserProfile() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
}

// ------------------------------------------------------------
// 2. STOCK APIS (CATALOG, DISCOVERY, SEARCH, COMPARISON)
// ------------------------------------------------------------

async function getAllStocks(params = {}) {
    const query = new URLSearchParams();
    if (params.q) query.append("q", params.q);
    if (params.sector && params.sector !== "all") query.append("sector", params.sector);
    if (params.category && params.category !== "all") query.append("category", params.category);
    if (params.page) query.append("page", params.page);
    if (params.limit) query.append("limit", params.limit);
    if (params.sort_by) query.append("sort_by", params.sort_by);

    const queryString = query.toString();
    const url = queryString ? `${API_BASE_URL}/stocks?${queryString}` : `${API_BASE_URL}/stocks`;
    const res = await fetch(url);
    return handleResponse(res);
}

async function searchStocks(query) {
    const res = await fetch(`${API_BASE_URL}/stocks/search?q=${encodeURIComponent(query)}`);
    return handleResponse(res);
}

async function getSectors() {
    const res = await fetch(`${API_BASE_URL}/stocks/sectors`);
    return handleResponse(res);
}

async function getStockDiscovery() {
    const res = await fetch(`${API_BASE_URL}/stocks/discovery`);
    return handleResponse(res);
}

async function compareStocks(symbols) {
    const symStr = Array.isArray(symbols) ? symbols.join(",") : symbols;
    const res = await fetch(`${API_BASE_URL}/stocks/compare?symbols=${encodeURIComponent(symStr)}`);
    return handleResponse(res);
}

async function getStockDetails(symbol) {
    const res = await fetch(`${API_BASE_URL}/stocks/${encodeURIComponent(symbol)}`);
    return handleResponse(res);
}

async function getStockHistory(symbol, period = "1M") {
    const res = await fetch(`${API_BASE_URL}/stocks/${encodeURIComponent(symbol)}/history?period=${period}`);
    return handleResponse(res);
}

async function getStockIndicators(symbol) {
    const res = await fetch(`${API_BASE_URL}/stocks/${encodeURIComponent(symbol)}/technical-indicators`);
    return handleResponse(res);
}

async function getStockAnalysis(symbol) {
    const res = await fetch(`${API_BASE_URL}/stocks/${encodeURIComponent(symbol)}/analysis`);
    return handleResponse(res);
}

async function getStockPrediction(symbol) {
    const res = await fetch(`${API_BASE_URL}/stocks/${encodeURIComponent(symbol)}/prediction`);
    return handleResponse(res);
}

// ------------------------------------------------------------
// 3. WATCHLIST APIS
// ------------------------------------------------------------

async function getWatchlist() {
    const res = await fetch(`${API_BASE_URL}/watchlist`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
}

async function addToWatchlist(symbol) {
    const res = await fetch(`${API_BASE_URL}/watchlist`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ symbol })
    });
    return handleResponse(res);
}

async function removeFromWatchlist(symbol) {
    const res = await fetch(`${API_BASE_URL}/watchlist/${encodeURIComponent(symbol)}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return handleResponse(res);
}

async function checkWatchlist(symbol) {
    const res = await fetch(`${API_BASE_URL}/watchlist/check/${encodeURIComponent(symbol)}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
}

// ------------------------------------------------------------
// 4. PORTFOLIO APIS
// ------------------------------------------------------------

async function getPortfolio() {
    const res = await fetch(`${API_BASE_URL}/portfolio`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
}

async function addPortfolioTransaction(transactionData) {
    const res = await fetch(`${API_BASE_URL}/portfolio/transaction`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(transactionData)
    });
    return handleResponse(res);
}

async function getPortfolioTransactions() {
    const res = await fetch(`${API_BASE_URL}/portfolio/transactions`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
}

async function deletePortfolioTransaction(id) {
    const res = await fetch(`${API_BASE_URL}/portfolio/transaction/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    return handleResponse(res);
}

// ------------------------------------------------------------
// 5. MARKET INDICES & NEWS APIS
// ------------------------------------------------------------

async function getMarketIndices() {
    const res = await fetch(`${API_BASE_URL}/market/indices`);
    return handleResponse(res);
}

async function getStockNews(symbol = "") {
    const url = symbol ? `${API_BASE_URL}/news/${encodeURIComponent(symbol)}` : `${API_BASE_URL}/news`;
    const res = await fetch(url);
    return handleResponse(res);
}

// ------------------------------------------------------------
// 6. AI ASSISTANT CHAT API
// ------------------------------------------------------------

async function sendChatMessage(message, symbol = null, conversationHistory = []) {
    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, symbol, conversationHistory })
    });
    return handleResponse(res);
}
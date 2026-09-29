// ============================================================
// StockSense — Dashboard Logic
// ============================================================

const stockList = document.getElementById("stockList");
const indicesList = document.getElementById("indicesList");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const sectorSelect = document.getElementById("sectorSelect");
const sortSelect = document.getElementById("sortSelect");
const capPills = document.getElementById("capPills");
const stocksTotalCount = document.getElementById("stocksTotalCount");
const paginationSummary = document.getElementById("paginationSummary");
const pageInfoText = document.getElementById("pageInfoText");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");

// Discovery Elements
const topGainersList = document.getElementById("topGainersList");
const topLosersList = document.getElementById("topLosersList");
const mostActiveList = document.getElementById("mostActiveList");

// State Management
let currentPage = 1;
const PAGE_LIMIT = 24;
let currentSector = "all";
let currentCategory = "all";
let currentSort = "name_asc";
let currentSearchQuery = "";
let selectedForComparison = new Set();

// Load Market Indices
async function loadMarketIndices() {
    if (!indicesList) return;

    try {
        const data = await getMarketIndices();
        if (data.success && data.indices && data.indices.length > 0) {
            indicesList.innerHTML = data.indices.map(idx => `
                <div class="index-card">
                    <div>
                        <div class="index-name">${idx.name} (${idx.exchange})</div>
                        <div class="index-value">₹${Number(idx.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div class="index-change ${idx.change >= 0 ? 'text-positive' : 'text-negative'}">
                        ${idx.changePercent}
                    </div>
                </div>
            `).join("");
        }
    } catch (err) {
        console.warn("Unable to load indices:", err.message);
    }
}

// Load Discovery Highlights (Gainers, Losers, Active)
async function loadDiscoveryHighlights() {
    try {
        const data = await getStockDiscovery();
        if (!data.success) return;

        // Render Top Gainers
        if (topGainersList) {
            if (data.topGainers && data.topGainers.length > 0) {
                topGainersList.innerHTML = data.topGainers.map(s => `
                    <a href="stock.html?symbol=${encodeURIComponent(s.symbol)}" class="mini-stock-item">
                        <div>
                            <div class="mini-stock-symbol">${s.symbol}</div>
                            <div class="mini-stock-name">${s.company_name}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 700; font-size: 13px;">₹${Number(s.price).toFixed(2)}</div>
                            <div class="text-positive" style="font-size: 11px;">${s.changePercent}</div>
                        </div>
                    </a>
                `).join("");
            } else {
                topGainersList.innerHTML = `<p style="font-size: 12px; color: var(--text-muted);">No gainers recorded in session.</p>`;
            }
        }

        // Render Top Losers
        if (topLosersList) {
            if (data.topLosers && data.topLosers.length > 0) {
                topLosersList.innerHTML = data.topLosers.map(s => `
                    <a href="stock.html?symbol=${encodeURIComponent(s.symbol)}" class="mini-stock-item">
                        <div>
                            <div class="mini-stock-symbol">${s.symbol}</div>
                            <div class="mini-stock-name">${s.company_name}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 700; font-size: 13px;">₹${Number(s.price).toFixed(2)}</div>
                            <div class="text-negative" style="font-size: 11px;">${s.changePercent}</div>
                        </div>
                    </a>
                `).join("");
            } else {
                topLosersList.innerHTML = `<p style="font-size: 12px; color: var(--text-muted);">No losers recorded in session.</p>`;
            }
        }

        // Render Most Active
        if (mostActiveList) {
            if (data.mostActive && data.mostActive.length > 0) {
                mostActiveList.innerHTML = data.mostActive.map(s => `
                    <a href="stock.html?symbol=${encodeURIComponent(s.symbol)}" class="mini-stock-item">
                        <div>
                            <div class="mini-stock-symbol">${s.symbol}</div>
                            <div class="mini-stock-name">${s.company_name}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 700; font-size: 13px;">₹${Number(s.price).toFixed(2)}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">${(Number(s.volume) / 1000).toFixed(0)}k vol</div>
                        </div>
                    </a>
                `).join("");
            } else {
                mostActiveList.innerHTML = `<p style="font-size: 12px; color: var(--text-muted);">Volume data unavailable.</p>`;
            }
        }

    } catch (err) {
        console.warn("Discovery loading note:", err.message);
    }
}

// Load Sector Filter Options
async function loadSectors() {
    if (!sectorSelect) return;
    try {
        const data = await getSectors();
        if (data.success && data.sectors) {
            sectorSelect.innerHTML = `<option value="all">All Sectors (${data.sectors.reduce((a, b) => a + b.count, 0)})</option>` +
                data.sectors.map(sec => `
                    <option value="${sec.sector}">${sec.sector} (${sec.count})</option>
                `).join("");
        }
    } catch (err) {
        console.warn("Sectors load warning:", err.message);
    }
}

// Load Paginated Stocks Catalog
async function loadStocks() {
    try {
        stockList.innerHTML = "<p>Loading stocks...</p>";

        const params = {
            page: currentPage,
            limit: PAGE_LIMIT,
            sort_by: currentSort
        };

        if (currentSearchQuery) params.q = currentSearchQuery;
        if (currentSector !== "all") params.sector = currentSector;
        if (currentCategory !== "all") params.category = currentCategory;

        const data = await getAllStocks(params);

        if (!data.success) {
            throw new Error(data.message || "Unable to load stocks");
        }

        if (stocksTotalCount) stocksTotalCount.textContent = `${data.total || data.count}`;
        if (paginationSummary) paginationSummary.textContent = `Showing page ${data.page} of ${data.totalPages || 1}`;
        if (pageInfoText) pageInfoText.textContent = `Page ${data.page} of ${data.totalPages || 1} (${data.total} total equities)`;

        if (prevPageBtn) prevPageBtn.disabled = data.page <= 1;
        if (nextPageBtn) nextPageBtn.disabled = data.page >= data.totalPages;

        if (!data.stocks || data.stocks.length === 0) {
            stockList.innerHTML = "<p>No stocks matching the selected criteria.</p>";
            return;
        }

        displayStocks(data.stocks);

    } catch (error) {
        console.error("Stock loading error:", error);
        stockList.innerHTML = `<p style="color: var(--danger);">Unable to load stocks: ${error.message}</p>`;
    }
}

// Render Stocks Grid
function displayStocks(stocks) {
    stockList.innerHTML = "";

    stocks.forEach(stock => {
        const card = document.createElement("div");
        card.className = "stock-card";

        const isSelected = selectedForComparison.has(stock.symbol);

        card.innerHTML = `
            <div>
                <div class="stock-card-header">
                    <h3>${stock.company_name}</h3>
                    <span class="stock-symbol-tag">${stock.symbol}</span>
                </div>
                <div class="stock-meta">
                    <div><strong>Exchange:</strong> ${stock.exchange} | <strong>Cap:</strong> ${stock.market_cap_category || "Large Cap"}</div>
                    <div><strong>Sector:</strong> ${stock.sector || "N/A"}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 4px;">${stock.industry || ""}</div>
                </div>
            </div>
            <div class="stock-card-actions">
                <button class="btn-view-stock" onclick="viewStock('${stock.symbol}')">
                    View Details
                </button>
                <button class="btn-add-watchlist-quick" onclick="quickAddToWatchlist('${stock.symbol}')" title="Save to Watchlist">
                    ★ Save
                </button>
                <button class="btn-add-watchlist-quick ${isSelected ? 'active' : ''}" style="${isSelected ? 'background: #eff6ff; color: #2563eb; font-weight: 700;' : ''}" onclick="toggleCompareSelect('${stock.symbol}')" title="Select for comparison">
                    ${isSelected ? '✓ Compare' : '+ Compare'}
                </button>
            </div>
        `;

        stockList.appendChild(card);
    });
}

// Quick Comparison Selection Logic
function toggleCompareSelect(symbol) {
    if (selectedForComparison.has(symbol)) {
        selectedForComparison.delete(symbol);
    } else {
        if (selectedForComparison.size >= 2) {
            const first = selectedForComparison.values().next().value;
            selectedForComparison.delete(first);
        }
        selectedForComparison.add(symbol);
    }
    updateCompareBar();
    loadStocks(); // re-render buttons
}

function updateCompareBar() {
    const compareBar = document.getElementById("compareBar");
    const compareSelectedText = document.getElementById("compareSelectedText");
    const launchCompareBtn = document.getElementById("launchCompareBtn");
    const clearCompareBtn = document.getElementById("clearCompareBtn");

    if (!compareBar) return;

    if (selectedForComparison.size > 0) {
        compareBar.style.display = "flex";
        const arr = Array.from(selectedForComparison);
        compareSelectedText.textContent = `${arr.join(" vs ")} (${arr.length}/2)`;
    } else {
        compareBar.style.display = "none";
    }

    if (launchCompareBtn) {
        launchCompareBtn.onclick = () => {
            const arr = Array.from(selectedForComparison);
            if (arr.length === 1) {
                window.location.href = `stock.html?symbol=${encodeURIComponent(arr[0])}`;
            } else {
                window.location.href = `ai-chat.html?compare=${encodeURIComponent(arr.join(","))}`;
            }
        };
    }

    if (clearCompareBtn) {
        clearCompareBtn.onclick = () => {
            selectedForComparison.clear();
            updateCompareBar();
            loadStocks();
        };
    }
}

// Quick Add to Watchlist
async function quickAddToWatchlist(symbol) {
    if (!isLoggedIn()) {
        showToast("Please sign in to save stocks to your Watchlist", "info");
        setTimeout(() => {
            window.location.href = `login.html?redirect=dashboard.html`;
        }, 1200);
        return;
    }

    try {
        const res = await addToWatchlist(symbol);
        if (res.success) {
            showToast(`⭐ ${symbol} added to your Watchlist!`, "success");
        }
    } catch (err) {
        showToast(err.message || "Could not add to watchlist", "error");
    }
}

function viewStock(symbol) {
    window.location.href = `stock.html?symbol=${encodeURIComponent(symbol)}`;
}

// Search with Debounce
let searchTimeout;
function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearchQuery = searchInput.value.trim();
        currentPage = 1;
        loadStocks();
    }, 300);
}

// Event Listeners
if (searchBtn) {
    searchBtn.addEventListener("click", () => {
        currentSearchQuery = searchInput.value.trim();
        currentPage = 1;
        loadStocks();
    });
}

if (searchInput) {
    searchInput.addEventListener("input", handleSearchInput);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            currentSearchQuery = searchInput.value.trim();
            currentPage = 1;
            loadStocks();
        }
    });
}

if (sectorSelect) {
    sectorSelect.addEventListener("change", (e) => {
        currentSector = e.target.value;
        currentPage = 1;
        loadStocks();
    });
}

if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
        currentSort = e.target.value;
        currentPage = 1;
        loadStocks();
    });
}

if (capPills) {
    capPills.addEventListener("click", (e) => {
        if (e.target.classList.contains("cap-pill")) {
            capPills.querySelectorAll(".cap-pill").forEach(p => p.classList.remove("active"));
            e.target.classList.add("active");
            currentCategory = e.target.getAttribute("data-category");
            currentPage = 1;
            loadStocks();
        }
    });
}

if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadStocks();
            window.scrollTo({ top: 400, behavior: "smooth" });
        }
    });
}

if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
        currentPage++;
        loadStocks();
        window.scrollTo({ top: 400, behavior: "smooth" });
    });
}

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
    loadMarketIndices();
    loadDiscoveryHighlights();
    loadSectors();
    loadStocks();
});
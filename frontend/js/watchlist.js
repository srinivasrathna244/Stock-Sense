// ============================================================
// StockSense — Watchlist Page Logic
// ============================================================

const watchlistContent = document.getElementById("watchlistContent");

async function loadUserWatchlist() {
    if (!requireAuth()) return;

    try {
        watchlistContent.innerHTML = "<p>Loading your saved stocks...</p>";
        const data = await getWatchlist();

        if (!data.success) {
            throw new Error(data.message || "Unable to load watchlist");
        }

        if (!data.watchlist || data.watchlist.length === 0) {
            watchlistContent.innerHTML = `
                <div class="empty-watchlist">
                    <h3>Your watchlist is empty</h3>
                    <p>Track your preferred companies and view AI predictions by adding stocks from the dashboard.</p>
                    <a href="dashboard.html" class="btn btn-primary">Browse Stocks</a>
                </div>
            `;
            return;
        }

        renderWatchlist(data.watchlist);

    } catch (err) {
        console.error("Watchlist error:", err);
        watchlistContent.innerHTML = `
            <p style="color: var(--danger);">Unable to load watchlist: ${err.message}</p>
        `;
    }
}

function renderWatchlist(items) {
    watchlistContent.innerHTML = items.map(item => {
        const market = item.market || {};
        const price = market.price !== null && market.price !== undefined ? `₹${Number(market.price).toFixed(2)}` : "N/A";
        const change = Number(market.change || 0);
        const changePercent = market.changePercent || "0.00%";
        const isPositive = change >= 0;

        let predictionBadge = "";
        if (item.prediction && item.prediction.direction) {
            const dir = item.prediction.direction;
            predictionBadge = `<span class="badge ${dir === 'UP' ? 'badge-up' : 'badge-down'}">AI: ${dir}</span>`;
        }

        return `
            <div class="watchlist-card" id="watchlist-row-${item.symbol}">
                <div class="watchlist-info">
                    <h3>${item.companyName} <span class="stock-symbol-tag">${item.symbol}</span></h3>
                    <div class="watchlist-meta">
                        ${item.exchange} | ${item.sector || 'General'} | Added ${new Date(item.addedAt).toLocaleDateString()}
                    </div>
                </div>

                <div style="display: flex; align-items: center;">
                    <div class="watchlist-price-block">
                        <div class="watchlist-price">${price}</div>
                        <div class="${isPositive ? 'text-positive' : 'text-negative'}" style="font-size: 13px; font-weight: 600;">
                            ${isPositive ? '+' : ''}${change.toFixed(2)} (${changePercent})
                        </div>
                    </div>

                    ${predictionBadge ? `<div style="margin-right: 20px;">${predictionBadge}</div>` : ''}

                    <div class="watchlist-actions">
                        <a href="stock.html?symbol=${encodeURIComponent(item.symbol)}" class="btn btn-primary" style="padding: 8px 14px; font-size: 13px;">
                            Analysis
                        </a>
                        <button class="btn btn-outline" onclick="removeStockFromWatchlist('${item.symbol}')" style="padding: 8px 12px; font-size: 13px; color: var(--danger); border-color: #fca5a5;" title="Remove">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

async function removeStockFromWatchlist(symbol) {
    if (!confirm(`Are you sure you want to remove ${symbol} from your watchlist?`)) {
        return;
    }

    try {
        const res = await removeFromWatchlist(symbol);
        if (res.success) {
            showToast(`${symbol} removed from watchlist`, "info");
            loadUserWatchlist();
        }
    } catch (err) {
        showToast(err.message || "Failed to remove stock", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadUserWatchlist();
});
